'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { RunSummary, UserDataUploadPayload } from './types';
import { api } from './api';

interface RunContextType {
  currentRun: RunSummary | null;
  isLoading: boolean;
  error: string | null;
  hasRunLoaded: boolean;
  allRuns: Array<{
    run_id: string;
    pipeline_type: string;
    dataset_name: string;
    created_at: string;
    total_source_records: number;
    reconciled_value_formatted: string;
    auto_approval_rate: number;
  }>;
  setCurrentRun: (summary: RunSummary) => void;
  loadRun: (runId: string) => Promise<void>;
  refreshCurrentRun: () => Promise<void>;
  executeSyntheticRun: (seed?: number, records?: number) => Promise<RunSummary | null>;
  executeUploadRun: (payload: UserDataUploadPayload) => Promise<RunSummary | null>;
  clearCurrentRun: () => void;
}

const RunContext = createContext<RunContextType | undefined>(undefined);

const STORAGE_KEY = 'realm_verify_active_run_summary';

export const RunProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRun, setCurrentRunState] = useState<RunSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [allRuns, setAllRuns] = useState<RunContextType['allRuns']>([]);

  // Function to set and persist active run
  const setCurrentRun = useCallback((summary: RunSummary) => {
    setCurrentRunState(summary);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(summary));
      }
    } catch {
      // Ignore localStorage errors in private browsing
    }
  }, []);

  // Fetch all runs available on backend
  const fetchAllRunsList = useCallback(async () => {
    try {
      const resp = await api.getAllRuns();
      if (resp?.runs) {
        setAllRuns(resp.runs);
      }
    } catch (e) {
      console.warn('Failed to fetch runs list:', e);
    }
  }, []);

  // Fetch active run summary from backend
  const refreshCurrentRun = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await api.getCurrentRunSummary();
      if (resp?.has_run && resp.summary) {
        setCurrentRun(resp.summary);
      } else {
        // Check if cached run exists in localStorage
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed?.run_id) {
                setCurrentRunState(parsed);
              }
            } catch {
              localStorage.removeItem(STORAGE_KEY);
            }
          }
        }
      }
      await fetchAllRunsList();
    } catch (err: any) {
      console.warn('Backend run fetch failed, checking local cache:', err.message);
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          try {
            setCurrentRunState(JSON.parse(cached));
          } catch {
            // ignore
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentRun, fetchAllRunsList]);

  // Load specific run by run_id
  const loadRun = useCallback(async (runId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await api.getRunSummary(runId);
      if (resp?.has_run && resp.summary) {
        setCurrentRun(resp.summary);
      } else {
        throw new Error(`Run ${runId} not found.`);
      }
    } catch (err: any) {
      setError(err.message || `Failed to load run ${runId}`);
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentRun]);

  // Execute synthetic pipeline run and sync state
  const executeSyntheticRun = useCallback(async (seed: number = 42, records: number = 500): Promise<RunSummary | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await api.runRealmVerify(seed, records);
      if (resp.summary) {
        setCurrentRun(resp.summary);
        await fetchAllRunsList();
        return resp.summary;
      }
      return null;
    } catch (err: any) {
      setError(err.message || 'Synthetic reconciliation run failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentRun, fetchAllRunsList]);

  // Execute custom file upload and sync state immediately
  const executeUploadRun = useCallback(async (payload: UserDataUploadPayload): Promise<RunSummary | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await api.runCustomUpload(payload);
      if (resp.summary) {
        setCurrentRun(resp.summary);
        await fetchAllRunsList();
        return resp.summary;
      }
      return null;
    } catch (err: any) {
      setError(err.message || 'Custom dataset upload failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentRun, fetchAllRunsList]);

  const clearCurrentRun = useCallback(async () => {
    setCurrentRunState(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    try {
      await api.clearCurrentRun();
    } catch {
      // ignore
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    refreshCurrentRun();
  }, [refreshCurrentRun]);

  const value: RunContextType = {
    currentRun,
    isLoading,
    error,
    hasRunLoaded: !!currentRun,
    allRuns,
    setCurrentRun,
    loadRun,
    refreshCurrentRun,
    executeSyntheticRun,
    executeUploadRun,
    clearCurrentRun,
  };

  return <RunContext.Provider value={value}>{children}</RunContext.Provider>;
};

export const useCurrentRun = (): RunContextType => {
  const context = useContext(RunContext);
  if (!context) {
    throw new Error('useCurrentRun must be used within a RunProvider');
  }
  return context;
};
