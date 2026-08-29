'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Play,
  Sparkles,
  FileSpreadsheet,
  Code2,
  Trash2,
  ArrowRight,
  Database,
  CreditCard,
  Building2,
  Download,
  FolderUp,
  Plus,
  FileCheck,
} from 'lucide-react';
import { GlassCard } from '../glass/GlassCard';
import { GlassButton } from '../glass/GlassButton';
import { GlassBadge } from '../glass/GlassBadge';
import { api } from '@/lib/api';
import { formatPaise } from '@/lib/formatters';
import { ReconciliationRunResponse, UserDataUploadPayload } from '@/lib/types';

export interface UploadedSourceSummary {
  txnsCount: number;
  txnsGrossMinor: number;
  txnsGrossFormatted: string;
  payoutsCount: number;
  payoutsGrossMinor: number;
  payoutsGrossFormatted: string;
  payoutsNetMinor: number;
  payoutsNetFormatted: string;
  banksCount: number;
  banksCreditMinor: number;
  banksCreditFormatted: string;
  dateRange: string;
  monthlySettlements: Record<string, string>;
  primaryMonth: string;
}

interface CustomDataUploadProps {
  onSuccess: (resp: ReconciliationRunResponse, sourceSummary?: UploadedSourceSummary) => void;
  isLoading?: boolean;
}

interface IngestedFileInfo {
  name: string;
  type: 'txns' | 'payouts' | 'banks';
  rowCount: number;
  size: number;
}

// Robust client-side RFC-4180 CSV parser preserving multi-token references and whitespace
function parseCSV(text: string): any[] {
  const lines: string[] = [];
  let currentRow = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      currentRow += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (currentRow.trim().length > 0) {
        lines.push(currentRow.trim());
      }
      currentRow = '';
      if (char === '\r' && text[i + 1] === '\n') {
        i++;
      }
    } else {
      currentRow += char;
    }
  }
  if (currentRow.trim().length > 0) {
    lines.push(currentRow.trim());
  }

  if (lines.length < 2) return [];

  function parseLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (c === ',' && !inQ) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const headers = parseLine(lines[0]).map((h) => h.replace(/^["']|["']$/g, '').trim());
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]).map((v) => v.replace(/^["']|["']$/g, '').trim());
    if (values.length === 1 && values[0] === '') continue;
    const obj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      let val: any = values[idx] ?? '';
      if (
        h.endsWith('_minor') ||
        h === 'amount' ||
        h === 'gross' ||
        h === 'net' ||
        h === 'fees' ||
        h === 'processing_fee' ||
        h === 'refund_amount' ||
        h === 'chargeback_amount'
      ) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) val = parsed;
      }
      obj[h] = val;
    });
    rows.push(obj);
  }
  return rows;
}

// Intelligent ledger classifier based on file headers & filename
function classifyDataset(headers: string[], fileName: string): 'txns' | 'payouts' | 'banks' {
  const lowerName = fileName.toLowerCase();
  const lowerHeaders = headers.map((h) => h.toLowerCase());

  // 1. Check Bank Statement identifiers
  if (
    lowerHeaders.some((h) => h.includes('bank_narration') || h.includes('account_number') || h.includes('credit_amount') || h.includes('value_date')) ||
    lowerName.includes('bank') ||
    lowerName.includes('statement') ||
    lowerName.includes('stmt') ||
    lowerName.includes('bnk')
  ) {
    return 'banks';
  }

  // 2. Check Gateway Payout identifiers
  if (
    lowerHeaders.some((h) => h.includes('payout_id') || h.includes('gateway_reference') || h.includes('processing_fee') || h.includes('net_settlement')) ||
    lowerName.includes('payout') ||
    lowerName.includes('gateway') ||
    lowerName.includes('settlement') ||
    lowerName.includes('po')
  ) {
    return 'payouts';
  }

  // 3. Default to Internal Transactions
  return 'txns';
}

export const CustomDataUpload: React.FC<CustomDataUploadProps> = ({ onSuccess, isLoading = false }) => {
  const [ingestionMode, setIngestionMode] = useState<'files' | 'editor'>('files');
  const [datasetName, setDatasetName] = useState<string>('Custom Enterprise Batch');

  // Multi-file datasets arrays
  const [txnsData, setTxnsData] = useState<any[]>([]);
  const [payoutsData, setPayoutsData] = useState<any[]>([]);
  const [banksData, setBanksData] = useState<any[]>([]);

  // Track ingested file metadata
  const [ingestedFiles, setIngestedFiles] = useState<IngestedFileInfo[]>([]);

  // Raw editor text
  const [rawTxnsJson, setRawTxnsJson] = useState<string>('');
  const [rawPayoutsJson, setRawPayoutsJson] = useState<string>('');
  const [rawBanksJson, setRawBanksJson] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const txnsFileRef = useRef<HTMLInputElement>(null);
  const payoutsFileRef = useRef<HTMLInputElement>(null);
  const banksFileRef = useRef<HTMLInputElement>(null);

  // Sample working enterprise dataset
  const sampleTxns = [
    { transaction_id: 'TXN_2026_001', customer_reference: 'AMZN-INV-882194', gross_amount_minor: 125000, currency: 'INR', created_at: '2026-08-20T10:00:00Z', counterparty_name: 'Amazon Logistics' },
    { transaction_id: 'TXN_2026_002', customer_reference: 'ZOMA-ORD-449102', gross_amount_minor: 85000, currency: 'INR', created_at: '2026-08-20T10:15:00Z', counterparty_name: 'Zomato Online' },
    { transaction_id: 'TXN_2026_003', customer_reference: 'SWIG-ORD-331908', gross_amount_minor: 65000, currency: 'INR', created_at: '2026-08-20T10:30:00Z', counterparty_name: 'Swiggy Delivery' },
    { transaction_id: 'TXN_2026_004', customer_reference: 'FLPK-INV-992341', gross_amount_minor: 210000, currency: 'INR', created_at: '2026-08-20T11:00:00Z', counterparty_name: 'Flipkart Wholesale' },
    { transaction_id: 'TXN_2026_005', customer_reference: 'BLNK-ORD-112450', gross_amount_minor: 45000, currency: 'INR', created_at: '2026-08-20T11:20:00Z', counterparty_name: 'Blinkit Instant' },
    { transaction_id: 'TXN_2026_006', customer_reference: 'MYNT-INV-773412', gross_amount_minor: 180000, currency: 'INR', created_at: '2026-08-20T12:00:00Z', counterparty_name: 'Myntra Fashion' },
    { transaction_id: 'TXN_2026_007', customer_reference: 'TATA-INV-552109', gross_amount_minor: 320000, currency: 'INR', created_at: '2026-08-20T12:45:00Z', counterparty_name: 'Tata Digital' },
    { transaction_id: 'TXN_2026_008', customer_reference: 'UBER-TRP-881230', gross_amount_minor: 55000, currency: 'INR', created_at: '2026-08-20T13:10:00Z', counterparty_name: 'Uber India' },
    { transaction_id: 'TXN_2026_009', customer_reference: 'OLAA-TRP-442190', gross_amount_minor: 48000, currency: 'INR', created_at: '2026-08-20T13:30:00Z', counterparty_name: 'Ola Mobility' },
    { transaction_id: 'TXN_2026_010', customer_reference: 'JIOO-SUB-661902', gross_amount_minor: 119000, currency: 'INR', created_at: '2026-08-20T14:00:00Z', counterparty_name: 'Reliance Jio' },
  ];

  const samplePayouts = [
    { payout_id: 'PO_2026_001', gateway_reference: 'AMZN-INV-882194 BATCH-8821', gross_amount_minor: 125000, processing_fee_minor: 2500, refund_amount_minor: 0, chargeback_amount_minor: 0, net_settlement_amount_minor: 122500, settlement_timestamp: '2026-08-21T02:00:00Z', batch_token: 'BATCH-8821' },
    { payout_id: 'PO_2026_002', gateway_reference: 'ZOMA-ORD-449102 SWIG-ORD-331908 BATCH-FOOD-99', gross_amount_minor: 150000, processing_fee_minor: 3000, refund_amount_minor: 0, chargeback_amount_minor: 0, net_settlement_amount_minor: 147000, settlement_timestamp: '2026-08-21T02:30:00Z', batch_token: 'BATCH-FOOD-99' },
    { payout_id: 'PO_2026_003', gateway_reference: 'FLPK-INV-992341 BATCH-9923', gross_amount_minor: 210000, processing_fee_minor: 4200, refund_amount_minor: 0, chargeback_amount_minor: 0, net_settlement_amount_minor: 205800, settlement_timestamp: '2026-08-21T03:00:00Z', batch_token: 'BATCH-9923' },
    { payout_id: 'PO_2026_004', gateway_reference: 'BLNK-ORD-112450 BATCH-1124', gross_amount_minor: 45000, processing_fee_minor: 900, refund_amount_minor: 0, chargeback_amount_minor: 0, net_settlement_amount_minor: 44100, settlement_timestamp: '2026-08-21T03:15:00Z', batch_token: 'BATCH-1124' },
    { payout_id: 'PO_2026_005', gateway_reference: 'MYNT-INV-773412 BATCH-7734', gross_amount_minor: 180000, processing_fee_minor: 3600, refund_amount_minor: 0, chargeback_amount_minor: 0, net_settlement_amount_minor: 176400, settlement_timestamp: '2026-08-21T03:45:00Z', batch_token: 'BATCH-7734' },
    { payout_id: 'PO_2026_006', gateway_reference: 'TATA-INV-552109 BATCH-5521', gross_amount_minor: 320000, processing_fee_minor: 6400, refund_amount_minor: 0, chargeback_amount_minor: 0, net_settlement_amount_minor: 313600, settlement_timestamp: '2026-08-21T04:00:00Z', batch_token: 'BATCH-5521' },
    { payout_id: 'PO_2026_007', gateway_reference: 'UBER-TRP-881230 OLAA-TRP-442190 BATCH-RIDE-77', gross_amount_minor: 103000, processing_fee_minor: 2060, refund_amount_minor: 0, chargeback_amount_minor: 0, net_settlement_amount_minor: 100940, settlement_timestamp: '2026-08-21T04:30:00Z', batch_token: 'BATCH-RIDE-77' },
    { payout_id: 'PO_2026_008', gateway_reference: 'JIOO-SUB-661902 BATCH-6619', gross_amount_minor: 119000, processing_fee_minor: 2380, refund_amount_minor: 0, chargeback_amount_minor: 0, net_settlement_amount_minor: 116620, settlement_timestamp: '2026-08-21T05:00:00Z', batch_token: 'BATCH-6619' },
  ];

  const sampleBanks = [
    { entry_id: 'BNK_2026_001', bank_name: 'HDFC Bank Ltd', account_number: '50200088991234', bank_narration: 'CMS/CR/RAZORPAY/AMZN-INV-882194/NET', credit_amount_minor: 122500, value_date: '2026-08-21' },
    { entry_id: 'BNK_2026_002', bank_name: 'ICICI Bank Pvt Ltd', account_number: '000405012345', bank_narration: 'CMS/CR/RAZORPAY/BATCH-FOOD-99/NODAL', credit_amount_minor: 147000, value_date: '2026-08-21' },
    { entry_id: 'BNK_2026_003', bank_name: 'Axis Bank Limited', account_number: '918020034567890', bank_narration: 'CMS/CR/RAZORPAY/FLPK-INV-992341/NET', credit_amount_minor: 205800, value_date: '2026-08-21' },
    { entry_id: 'BNK_2026_004', bank_name: 'HDFC Bank Ltd', account_number: '50200088991234', bank_narration: 'CMS/CR/RAZORPAY/BLNK-ORD-112450/NET', credit_amount_minor: 44100, value_date: '2026-08-21' },
    { entry_id: 'BNK_2026_005', bank_name: 'State Bank of India', account_number: '30987654321', bank_narration: 'CMS/CR/RAZORPAY/MYNT-INV-773412/NET', credit_amount_minor: 176400, value_date: '2026-08-21' },
    { entry_id: 'BNK_2026_006', bank_name: 'HDFC Bank Ltd', account_number: '50200088991234', bank_narration: 'CMS/CR/RAZORPAY/TATA-INV-552109/NET', credit_amount_minor: 313600, value_date: '2026-08-21' },
    { entry_id: 'BNK_2026_007', bank_name: 'ICICI Bank Pvt Ltd', account_number: '000405012345', bank_narration: 'CMS/CR/RAZORPAY/BATCH-RIDE-77/NODAL', credit_amount_minor: 100940, value_date: '2026-08-21' },
    { entry_id: 'BNK_2026_008', bank_name: 'Axis Bank Limited', account_number: '918020034567890', bank_narration: 'CMS/CR/RAZORPAY/JIOO-SUB-661902/NET', credit_amount_minor: 116620, value_date: '2026-08-21' },
  ];

  const handleLoadSamplePayload = () => {
    setTxnsData(sampleTxns);
    setPayoutsData(samplePayouts);
    setBanksData(sampleBanks);
    setIngestedFiles([
      { name: 'sample_internal_transactions.csv', type: 'txns', rowCount: sampleTxns.length, size: 2048 },
      { name: 'sample_gateway_payouts.csv', type: 'payouts', rowCount: samplePayouts.length, size: 1840 },
      { name: 'sample_bank_statements.csv', type: 'banks', rowCount: sampleBanks.length, size: 1950 },
    ]);
    setDatasetName('Enterprise Multi-Gateway Nodal (Golden Demo)');
    setRawTxnsJson(JSON.stringify(sampleTxns, null, 2));
    setRawPayoutsJson(JSON.stringify(samplePayouts, null, 2));
    setRawBanksJson(JSON.stringify(sampleBanks, null, 2));
    setError(null);
  };

  const handleClearAll = () => {
    setTxnsData([]);
    setPayoutsData([]);
    setBanksData([]);
    setIngestedFiles([]);
    setRawTxnsJson('');
    setRawPayoutsJson('');
    setRawBanksJson('');
    setError(null);
  };

  // Process incoming files (single or multiple)
  const processUploadedFiles = async (fileList: FileList | File[], targetType?: 'txns' | 'payouts' | 'banks') => {
    const files = Array.from(fileList);
    if (!files.length) return;

    let newTxns = [...txnsData];
    let newPos = [...payoutsData];
    let newBanks = [...banksData];
    const newIngested = [...ingestedFiles];

    for (const file of files) {
      try {
        const text = await file.text();
        let parsed: any[] = [];
        let detectedHeaders: string[] = [];

        if (file.name.endsWith('.json')) {
          const json = JSON.parse(text);
          parsed = Array.isArray(json) ? json : [json];
          if (parsed.length > 0) detectedHeaders = Object.keys(parsed[0]);
        } else {
          // CSV parsing
          parsed = parseCSV(text);
          if (parsed.length > 0) detectedHeaders = Object.keys(parsed[0]);
        }

        const resolvedType = targetType || classifyDataset(detectedHeaders, file.name);

        if (resolvedType === 'txns') {
          newTxns = [...newTxns, ...parsed];
        } else if (resolvedType === 'payouts') {
          newPos = [...newPos, ...parsed];
        } else if (resolvedType === 'banks') {
          newBanks = [...newBanks, ...parsed];
        }

        newIngested.push({
          name: file.name,
          type: resolvedType,
          rowCount: parsed.length,
          size: file.size,
        });

      } catch (err: any) {
        setError(`Failed to read ${file.name}: ${err.message}`);
      }
    }

    setTxnsData(newTxns);
    setPayoutsData(newPos);
    setBanksData(newBanks);
    setIngestedFiles(newIngested);

    setRawTxnsJson(JSON.stringify(newTxns, null, 2));
    setRawPayoutsJson(JSON.stringify(newPos, null, 2));
    setRawBanksJson(JSON.stringify(newBanks, null, 2));

    // Auto derive clean dataset name if standard
    if (files.length > 0 && (datasetName === 'Custom Enterprise Batch' || datasetName.startsWith('Custom'))) {
      const cleanName = files[0].name
        .replace(/\.(csv|json)$/i, '')
        .replace(/[_]+/g, ' ')
        .replace(/(internal|transactions|gateway|payouts|bank|statements)/gi, '')
        .trim();
      if (cleanName) {
        const formatted = cleanName
          .split(' ')
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        setDatasetName(`Enterprise ${formatted} (${files.length} files)`);
      }
    }
  };

  const handleMultiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processUploadedFiles(e.target.files);
    }
  };

  const handleSpecificFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'txns' | 'payouts' | 'banks') => {
    if (e.target.files) {
      processUploadedFiles(e.target.files, type);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  const handleExecuteUpload = async () => {
    setLoading(true);
    setError(null);
    try {
      let txns = txnsData;
      let pos = payoutsData;
      let banks = banksData;

      if (ingestionMode === 'editor') {
        if (!rawTxnsJson.trim() || !rawPayoutsJson.trim() || !rawBanksJson.trim()) {
          throw new Error('Please provide data for all 3 ledgers. Click "Load Enterprise Sample Files" for instant data.');
        }
        try {
          txns = JSON.parse(rawTxnsJson);
        } catch {
          throw new Error('Invalid JSON in Internal Transactions input.');
        }
        try {
          pos = JSON.parse(rawPayoutsJson);
        } catch {
          throw new Error('Invalid JSON in Gateway Payouts input.');
        }
        try {
          banks = JSON.parse(rawBanksJson);
        } catch {
          throw new Error('Invalid JSON in Bank Statements input.');
        }
      }

      if (!txns || !pos || !banks || txns.length === 0 || pos.length === 0 || banks.length === 0) {
        throw new Error('Please upload or load data for all 3 ledgers (Transactions, Payouts, and Bank Statements). Click "Load Enterprise Sample Files" to test instantly.');
      }

      const payload: UserDataUploadPayload = {
        dataset_name: datasetName,
        internal_transactions: Array.isArray(txns) ? txns : [txns],
        gateway_payouts: Array.isArray(pos) ? pos : [pos],
        bank_statements: Array.isArray(banks) ? banks : [banks],
      };

      const resp = await api.runCustomUpload(payload);
      if (resp.success) {
        const safeTxns = payload.internal_transactions;
        const safePos = payload.gateway_payouts;
        const safeBanks = payload.bank_statements;

        let txnsGrossMinor = 0;
        safeTxns.forEach((t) => {
          txnsGrossMinor += Number(t.gross_amount_minor || t.amount || t.gross || 0);
        });

        let posGrossMinor = 0;
        let posNetMinor = 0;
        safePos.forEach((p) => {
          posGrossMinor += Number(p.gross_amount_minor || p.gross || p.amount || 0);
          posNetMinor += Number(p.net_settlement_amount_minor || p.net || 0);
        });

        let banksCreditMinor = 0;
        safeBanks.forEach((b) => {
          banksCreditMinor += Number(b.credit_amount_minor || b.amount || b.credit || 0);
        });

        const dateStrings: string[] = [];
        const monthTotals: Record<string, number> = {};
        const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const extractDate = (dStr?: any) => {
          if (!dStr) return;
          try {
            const dt = new Date(dStr);
            if (!isNaN(dt.getTime())) {
              dateStrings.push(dt.toISOString().slice(0, 10));
              const mIdx = dt.getUTCMonth();
              const mName = monthsList[mIdx];
              monthTotals[mName] = (monthTotals[mName] || 0) + 1;
            }
          } catch {}
        };

        safeTxns.forEach((t) => extractDate(t.created_at || t.date || t.timestamp));
        safePos.forEach((p) => extractDate(p.settlement_timestamp || p.date || p.created_at));
        safeBanks.forEach((b) => extractDate(b.value_date || b.date));

        dateStrings.sort();
        let dateRange = 'Active Audit Period';
        if (dateStrings.length > 0) {
          const minDate = dateStrings[0];
          const maxDate = dateStrings[dateStrings.length - 1];
          dateRange = `${minDate} → ${maxDate}`;
        }

        let primaryMonth = 'Aug';
        let maxMonthCount = 0;
        Object.entries(monthTotals).forEach(([m, count]) => {
          if (count > maxMonthCount) {
            maxMonthCount = count;
            primaryMonth = m;
          }
        });

        const monthlySettlements: Record<string, string> = {
          Jan: '₹ 0.00', Feb: '₹ 0.00', Mar: '₹ 0.00', Apr: '₹ 0.00',
          May: '₹ 0.00', Jun: '₹ 0.00', Jul: '₹ 0.00', Aug: '₹ 0.00',
          Sep: '₹ 0.00', Oct: '₹ 0.00', Nov: '₹ 0.00', Dec: '₹ 0.00',
        };
        monthlySettlements[primaryMonth] = formatPaise(resp.metrics?.reconciled_value_minor || posNetMinor);

        const summary: UploadedSourceSummary = {
          txnsCount: safeTxns.length,
          txnsGrossMinor,
          txnsGrossFormatted: formatPaise(txnsGrossMinor),
          payoutsCount: safePos.length,
          payoutsGrossMinor: posGrossMinor,
          payoutsGrossFormatted: formatPaise(posGrossMinor),
          payoutsNetMinor: posNetMinor,
          payoutsNetFormatted: formatPaise(posNetMinor),
          banksCount: safeBanks.length,
          banksCreditMinor,
          banksCreditFormatted: formatPaise(banksCreditMinor),
          dateRange,
          monthlySettlements,
          primaryMonth,
        };

        onSuccess(resp, summary);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process user dataset.');
    } finally {
      setLoading(false);
    }
  };

  const totalLoadedRecords = txnsData.length + payoutsData.length + banksData.length;
  const allFilesLoaded = txnsData.length > 0 && payoutsData.length > 0 && banksData.length > 0;

  return (
    <GlassCard variant="elevated" className="p-6 sm:p-8 mb-8 border-accent/20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-accent mb-1">
            <UploadCloud className="w-4 h-4 text-accent" />
            <span>ENTERPRISE BULK MULTI-LEDGER INGESTION STUDIO</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-mono text-white uppercase tracking-tight">
            Multi-File Batch Ingestion System
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-2xl">
            Upload multiple files simultaneously. Drag & drop all 3 ledgers at once or select multiple CSV/JSON batches. The 5-Agent engine auto-classifies schemas, merges records, and reconciles with 0-paise mathematical proof.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center p-1 rounded-xl glass-panel border-white/10">
            <button
              onClick={() => setIngestionMode('files')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                ingestionMode === 'files'
                  ? 'bg-accent text-background font-bold shadow-glow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Multi-File Bulk Upload
            </button>
            <button
              onClick={() => setIngestionMode('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                ingestionMode === 'editor'
                  ? 'bg-accent text-background font-bold shadow-glow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              JSON Data Editor
            </button>
          </div>

          <GlassButton
            size="sm"
            variant="secondary"
            icon={<Sparkles className="w-3.5 h-3.5 text-accent" />}
            onClick={handleLoadSamplePayload}
          >
            Load Golden Demo (8 Txns)
          </GlassButton>

          {totalLoadedRecords > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Files
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-status-unresolved/20 border border-status-unresolved/40 text-status-unresolved text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Dataset Identifier & Ingestion Summary Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white/[0.02] p-4 rounded-2xl border border-white/10">
        <div className="flex-1 min-w-[280px]">
          <label className="block text-[11px] font-mono uppercase text-white/50 mb-1">
            Batch Label / Reconciliation Job Name
          </label>
          <input
            type="text"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            className="w-full px-4 py-2 rounded-xl glass-input text-xs font-mono"
            placeholder="e.g. Enterprise Batch 01 (10,000 Records)"
          />
        </div>

        {/* Live Counters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
            <span className="text-white/40 block text-[10px]">TXNS</span>
            <span className="font-bold text-white">{txnsData.length.toLocaleString('en-IN')}</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
            <span className="text-white/40 block text-[10px]">PAYOUTS</span>
            <span className="font-bold text-accent">{payoutsData.length.toLocaleString('en-IN')}</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
            <span className="text-white/40 block text-[10px]">BANKS</span>
            <span className="font-bold text-status-approved">{banksData.length.toLocaleString('en-IN')}</span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-accent/10 border border-accent/30 text-xs font-mono">
            <span className="text-accent/70 block text-[10px]">TOTAL ROWS</span>
            <span className="font-bold text-accent">{totalLoadedRecords.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* MODE 1: FILE UPLOAD DROPZONES */}
      {ingestionMode === 'files' ? (
        <div className="space-y-6 mb-8">
          
          {/* ============================================================ */}
          {/* UNIVERSAL MULTI-FILE DROPZONE (SMART AUTO-CLASSIFIER)       */}
          {/* ============================================================ */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => multiFileInputRef.current?.click()}
            className="p-8 rounded-3xl border-2 border-dashed border-accent/40 hover:border-accent bg-accent/05 hover:bg-accent/10 transition-all cursor-pointer text-center group relative overflow-hidden"
          >
            <input
              type="file"
              ref={multiFileInputRef}
              accept=".csv,.json"
              multiple={true}
              className="hidden"
              onChange={handleMultiFileChange}
            />
            
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent shadow-glow-sm group-hover:scale-105 transition-transform">
                <FolderUp className="w-8 h-8 text-accent animate-pulse" />
              </div>
              
              <div>
                <h3 className="text-base sm:text-lg font-bold font-mono text-white">
                  Drop Multiple Files Here or Click to Browse All Files at Once
                </h3>
                <p className="text-xs text-white/60 max-w-xl mx-auto mt-1 leading-relaxed">
                  Select 3, 10, 20, or up to 50 files simultaneously. The AI classifier automatically reads headers, categorizes each file into Transactions, Payouts, or Bank Statements, and merges multiple batch files.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] font-mono text-white/50">
                <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10">.CSV & .JSON Supported</span>
                <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10">Auto Schema Detection</span>
                <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10">Instant Multi-Batch Merge</span>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* INGESTED FILES TRAY                                         */}
          {/* ============================================================ */}
          {ingestedFiles.length > 0 && (
            <div className="p-4 rounded-2xl bg-black/30 border border-white/10">
              <div className="flex items-center justify-between text-xs font-mono text-white/60 mb-3 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-accent" />
                  <span className="font-bold text-white uppercase tracking-wider">
                    Ingested File Queue ({ingestedFiles.length} files)
                  </span>
                </div>
                <span className="text-[11px] text-white/40">Ready for 5-Agent Consensus</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto custom-scrollbar">
                {ingestedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/05 flex items-center justify-between gap-2 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileSpreadsheet className="w-4 h-4 text-accent shrink-0" />
                      <div className="truncate">
                        <div className="font-bold text-white truncate text-[11px]">{file.name}</div>
                        <div className="text-[10px] text-white/40">{file.rowCount.toLocaleString('en-IN')} rows · {(file.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                    
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 border ${
                        file.type === 'txns'
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          : file.type === 'payouts'
                          ? 'bg-accent/15 text-accent border-accent/30'
                          : 'bg-status-approved/15 text-status-approved border-status-approved/30'
                      }`}
                    >
                      {file.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* INDIVIDUAL LEDGER DROPZONES (SUPPORT MULTIPLE FILES EACH)   */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Ledger 1: Internal Transactions */}
            <div
              onClick={() => txnsFileRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col justify-between min-h-[200px] ${
                txnsData.length > 0
                  ? 'border-blue-500/50 bg-blue-500/05'
                  : 'border-white/15 hover:border-accent/40 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <input
                type="file"
                ref={txnsFileRef}
                accept=".csv,.json"
                multiple={true}
                className="hidden"
                onChange={(e) => handleSpecificFileChange(e, 'txns')}
              />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Database className="w-5 h-5" />
                  </div>
                  {txnsData.length > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-status-approved" />
                  ) : (
                    <span className="text-[10px] font-mono text-white/40">REQUIRED</span>
                  )}
                </div>
                <h3 className="text-sm font-bold font-mono text-white mb-1">
                  1. Internal Transactions
                </h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  Core ledger invoices, transaction IDs, customer references, and gross paise.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                {txnsData.length > 0 ? (
                  <span className="text-blue-300 font-semibold truncate max-w-[180px]">
                    {txnsData.length.toLocaleString('en-IN')} total transactions
                  </span>
                ) : (
                  <span className="text-accent underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Select or add files
                  </span>
                )}
                <span className="text-white/40 text-[10px]">.csv / .json</span>
              </div>
            </div>

            {/* Ledger 2: Gateway Payouts */}
            <div
              onClick={() => payoutsFileRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col justify-between min-h-[200px] ${
                payoutsData.length > 0
                  ? 'border-accent/50 bg-accent/05'
                  : 'border-white/15 hover:border-accent/40 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <input
                type="file"
                ref={payoutsFileRef}
                accept=".csv,.json"
                multiple={true}
                className="hidden"
                onChange={(e) => handleSpecificFileChange(e, 'payouts')}
              />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  {payoutsData.length > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-status-approved" />
                  ) : (
                    <span className="text-[10px] font-mono text-white/40">REQUIRED</span>
                  )}
                </div>
                <h3 className="text-sm font-bold font-mono text-white mb-1">
                  2. Gateway Payouts (Razorpay/PayU)
                </h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  Settlement payout files with gross amounts, processing fees, refunds, and batch tokens.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                {payoutsData.length > 0 ? (
                  <span className="text-accent font-semibold truncate max-w-[180px]">
                    {payoutsData.length.toLocaleString('en-IN')} total payouts
                  </span>
                ) : (
                  <span className="text-accent underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Select or add files
                  </span>
                )}
                <span className="text-white/40 text-[10px]">.csv / .json</span>
              </div>
            </div>

            {/* Ledger 3: Bank Statements */}
            <div
              onClick={() => banksFileRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col justify-between min-h-[200px] ${
                banksData.length > 0
                  ? 'border-status-approved/50 bg-status-approved/05'
                  : 'border-white/15 hover:border-accent/40 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <input
                type="file"
                ref={banksFileRef}
                accept=".csv,.json"
                multiple={true}
                className="hidden"
                onChange={(e) => handleSpecificFileChange(e, 'banks')}
              />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-status-approved/15 border border-status-approved/30 flex items-center justify-center text-status-approved">
                    <Building2 className="w-5 h-5" />
                  </div>
                  {banksData.length > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-status-approved" />
                  ) : (
                    <span className="text-[10px] font-mono text-white/40">REQUIRED</span>
                  )}
                </div>
                <h3 className="text-sm font-bold font-mono text-white mb-1">
                  3. Bank Statements (Nodal Feeds)
                </h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  Bank nodal credit entries with noisy narrations, UTRs, account numbers, and value dates.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                {banksData.length > 0 ? (
                  <span className="text-status-approved font-semibold truncate max-w-[180px]">
                    {banksData.length.toLocaleString('en-IN')} total bank entries
                  </span>
                ) : (
                  <span className="text-accent underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Select or add files
                  </span>
                )}
                <span className="text-white/40 text-[10px]">.csv / .json</span>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* MODE 2: DIRECT JSON EDITORS */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-xs font-mono uppercase text-white/60 mb-2 flex items-center justify-between">
              <span>1. Internal Transactions (JSON)</span>
              <span className="text-[10px] text-white/40">{rawTxnsJson ? `${rawTxnsJson.length} bytes` : 'empty'}</span>
            </label>
            <textarea
              rows={10}
              value={rawTxnsJson}
              onChange={(e) => setRawTxnsJson(e.target.value)}
              placeholder='[\n  {\n    "transaction_id": "TXN_101",\n    "customer_reference": "ORDER-9921-A",\n    "gross_amount_minor": 125000,\n    "currency": "INR",\n    "created_at": "2026-08-20T10:00:00Z"\n  }\n]'
              className="w-full p-3 rounded-xl glass-input text-xs font-mono leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-white/60 mb-2 flex items-center justify-between">
              <span>2. Gateway Payouts (JSON)</span>
              <span className="text-[10px] text-white/40">{rawPayoutsJson ? `${rawPayoutsJson.length} bytes` : 'empty'}</span>
            </label>
            <textarea
              rows={10}
              value={rawPayoutsJson}
              onChange={(e) => setRawPayoutsJson(e.target.value)}
              placeholder='[\n  {\n    "payout_id": "PO_BATCH_01",\n    "gateway_reference": "ORDER-9921-A BATCH-9921",\n    "gross_amount_minor": 200000,\n    "processing_fee_minor": 4000,\n    "net_settlement_amount_minor": 196000,\n    "settlement_timestamp": "2026-08-21T02:00:00Z"\n  }\n]'
              className="w-full p-3 rounded-xl glass-input text-xs font-mono leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-white/60 mb-2 flex items-center justify-between">
              <span>3. Bank Statements (JSON)</span>
              <span className="text-[10px] text-white/40">{rawBanksJson ? `${rawBanksJson.length} bytes` : 'empty'}</span>
            </label>
            <textarea
              rows={10}
              value={rawBanksJson}
              onChange={(e) => setRawBanksJson(e.target.value)}
              placeholder='[\n  {\n    "entry_id": "BANK_CREDIT_01",\n    "bank_narration": "CMS/CR/RAZORPAY/BATCH-9921",\n    "credit_amount_minor": 196000,\n    "value_date": "2026-08-21T06:00:00Z"\n  }\n]'
              className="w-full p-3 rounded-xl glass-input text-xs font-mono leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-white/10">
        <div className="text-xs font-mono text-white/60 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span>
            {allFilesLoaded
              ? `✓ Ready to reconcile ${totalLoadedRecords.toLocaleString('en-IN')} total records across ${ingestedFiles.length || 3} file(s)`
              : 'Please load or drop files for all 3 ledgers to execute full reconciliation.'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <GlassButton
            size="lg"
            variant="primary"
            icon={<Play className="w-4 h-4 fill-background" />}
            onClick={handleExecuteUpload}
            loading={loading || isLoading}
            disabled={!allFilesLoaded || loading || isLoading}
          >
            {loading ? 'Reconciling Multi-File Batch...' : `Execute 5-Agent Reconciliation (${totalLoadedRecords.toLocaleString('en-IN')} Rows)`}
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  );
};
