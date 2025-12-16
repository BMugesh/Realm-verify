#!/usr/bin/env python3
"""
🌀 REALM THEORY v2.0 - Setup & Quick Start Guide
"""

import os
import sys
import subprocess

def print_banner():
    banner = """
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║         🌀 REALM THEORY VISUAL SIMULATOR v2.0 🌀            ║
    ║                                                              ║
    ║  Advanced Quantum Field Visualization & Analysis Platform    ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)

def check_python():
    """Check Python version"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 7):
        print("❌ Python 3.7+ required!")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} detected")
    return True

def check_dependencies():
    """Check and install dependencies"""
    required = ['numpy', 'streamlit', 'matplotlib', 'plotly', 'scipy']
    missing = []
    
    print("\n📦 Checking dependencies...")
    for package in required:
        try:
            __import__(package)
            print(f"  ✅ {package}")
        except ImportError:
            print(f"  ❌ {package} - MISSING")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️  Missing packages: {', '.join(missing)}")
        response = input("Install missing packages? (y/n): ").lower()
        if response == 'y':
            print("\n📥 Installing packages...")
            for package in missing:
                subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])
            print("✅ Installation complete!")
        else:
            print("⚠️  Some features may not work without dependencies")
            return False
    return True

def list_applications():
    """Show available applications"""
    print("\n" + "="*60)
    print("📺 AVAILABLE APPLICATIONS")
    print("="*60)
    
    apps = {
        "1": {
            "name": "realm_simulator_enhanced.py",
            "description": "Main Enhanced Simulator (RECOMMENDED)",
            "command": "streamlit run realm_simulator_enhanced.py",
            "features": [
                "✅ Fixed animations",
                "✅ 8 interactive tabs",
                "✅ 6+ surface plots",
                "✅ Mathematical equations",
                "✅ Theorem & Conclusion",
                "✅ Real-time statistics"
            ]
        },
        "2": {
            "name": "Therom_enhanced.py",
            "description": "Advanced 3D Visualizer",
            "command": "streamlit run Therom_enhanced.py",
            "features": [
                "✅ Plotly 3D rendering",
                "✅ 4 field models",
                "✅ Advanced statistics",
                "✅ Field animation",
                "✅ Data export",
                "✅ Unity integration"
            ]
        },
        "3": {
            "name": "theory.ipynb",
            "description": "Jupyter Notebook Analysis",
            "command": "jupyter notebook theory.ipynb",
            "features": [
                "✅ Step-by-step theory",
                "✅ Mathematical validation",
                "✅ Interactive cells",
                "✅ Parameter exploration"
            ]
        }
    }
    
    for key, app in apps.items():
        print(f"\n{key}. {app['name']}")
        print(f"   📝 {app['description']}")
        print(f"   Command: {app['command']}")
        print(f"   Features:")
        for feature in app['features']:
            print(f"      {feature}")
    
    return apps

def run_application(choice, apps):
    """Run selected application"""
    if choice not in apps:
        print("❌ Invalid choice!")
        return False
    
    app = apps[choice]
    print(f"\n🚀 Starting {app['name']}...")
    print(f"Command: {app['command']}")
    
    try:
        os.system(app['command'])
    except Exception as e:
        print(f"❌ Error running application: {e}")
        return False
    
    return True

def show_help():
    """Show help information"""
    print("""
    🔍 QUICK HELP
    
    What each simulator offers:
    
    📌 REALM SIMULATOR ENHANCED (Main App)
       - Best for: General users, students, quick exploration
       - Animations: ✅ FIXED and working properly
       - Visualizations: 6+ different plot types
       - Theory: Complete theorem and conclusion sections
       - Best for beginners
       
    🌌 THEROM ENHANCED (Advanced)
       - Best for: Researchers, advanced analysis
       - 3D Rendering: High-quality Plotly
       - Statistics: Comprehensive numerical analysis
       - Export: JSON, CSV, Unity integration
       - Best for power users
       
    📓 THEORY NOTEBOOK
       - Best for: Mathematical deep dive
       - Interactive: Cell-by-cell exploration
       - Validation: Step-by-step verification
       - Best for learning the math
    
    ⚙️ KEYBOARD SHORTCUTS
    
    In Streamlit apps:
    - 'r' : Rerun the app
    - 'c' : Clear cache
    - 'k' : Show keyboard shortcuts
    - 'v' : Show/hide main menu
    
    📚 RESOURCES
    
    - ENHANCED_README.md : Detailed feature guide
    - README.md : Original project documentation
    - theory.ipynb : Mathematical theory notebook
    """)

def main():
    os.system('clear' if os.name != 'nt' else 'cls')
    print_banner()
    
    if not check_python():
        sys.exit(1)
    
    if not check_dependencies():
        print("⚠️  Proceeding with available packages...")
    
    apps = list_applications()
    
    print("\n" + "="*60)
    print("🎮 SELECT APPLICATION TO RUN")
    print("="*60)
    print("\nOptions:")
    print("  1 - Enhanced Simulator (RECOMMENDED) ⭐")
    print("  2 - Advanced 3D Visualizer")
    print("  3 - Theory Jupyter Notebook")
    print("  4 - Show Help Information")
    print("  5 - Exit")
    
    choice = input("\nEnter choice (1-5): ").strip()
    
    if choice == '4':
        show_help()
        main()  # Show menu again
    elif choice == '5':
        print("\n👋 Goodbye! Thanks for using Realm Theory Simulator!")
        sys.exit(0)
    elif choice in ['1', '2', '3']:
        run_application(choice, apps)
    else:
        print("❌ Invalid choice! Please enter 1-5")
        main()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  Interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
