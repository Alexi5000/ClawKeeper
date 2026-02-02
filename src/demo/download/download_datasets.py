#!/usr/bin/env python3
# file: src/demo/download/download_datasets.py
# description: Downloads Hugging Face datasets for ClawKeeper demo
# reference: requirements.txt

import os
import json
from pathlib import Path
from datasets import load_dataset
from tqdm import tqdm
import pandas as pd

# Configuration
RAW_DIR = Path(__file__).parent / "raw"
RAW_DIR.mkdir(exist_ok=True)

DATASETS_CONFIG = [
    # Priority 1: Core datasets
    {
        "name": "mitulshah/transaction-categorization",
        "split": "train",
        "sample_size": 10000,  # Sample for demo (from 4.5M)
        "output": "transactions.parquet",
        "priority": 1
    },
    {
        "name": "philschmid/ocr-invoice-data",
        "split": "train",
        "sample_size": None,  # Use all ~2.2K
        "output": "invoices.parquet",
        "priority": 1
    },
    {
        "name": "Console-AI/IT-helpdesk-synthetic-tickets",
        "split": "train",
        "sample_size": None,  # Use all 500
        "output": "support_tickets.parquet",
        "priority": 1
    },
    
    # Priority 2: Extended coverage
    {
        "name": "bitext/Bitext-customer-support-llm-chatbot-training-dataset",
        "split": "train",
        "sample_size": 1000,  # Sample from 27K
        "output": "support_conversations.parquet",
        "priority": 2
    },
    {
        "name": "Voxel51/scanned_receipts",
        "split": "train",
        "sample_size": 200,  # Sample from 713 images
        "output": "receipts.parquet",
        "priority": 2
    },
    {
        "name": "purulalwani/Synthetic-Financial-Datasets-For-Fraud-Detection",
        "split": "train",
        "sample_size": 5000,  # Sample from 6.3M
        "output": "fraud_scenarios.parquet",
        "priority": 2
    },
    
    # Priority 3: Specialized
    {
        "name": "JanosAudran/financial-reports-sec",
        "split": "train",
        "sample_size": 100,  # Sample SEC filings
        "output": "financial_reports.parquet",
        "priority": 3
    },
    {
        "name": "datapizza-ai-lab/salaries",
        "split": "train",
        "sample_size": None,  # Use all salary data
        "output": "salaries.parquet",
        "priority": 3
    }
]


def download_dataset(config):
    """Download and save a single dataset"""
    print(f"\n{'='*60}")
    print(f"Downloading: {config['name']}")
    print(f"Priority: {config['priority']}")
    print(f"{'='*60}")
    
    try:
        # Load dataset
        dataset = load_dataset(config['name'], split=config['split'])
        
        print(f"Total rows: {len(dataset)}")
        
        # Sample if needed
        if config['sample_size'] and len(dataset) > config['sample_size']:
            dataset = dataset.shuffle(seed=42).select(range(config['sample_size']))
            print(f"Sampled to: {len(dataset)} rows")
        
        # Convert to pandas for easier manipulation
        df = dataset.to_pandas()
        
        # Save as parquet
        output_path = RAW_DIR / config['output']
        df.to_parquet(output_path, index=False)
        
        print(f"✅ Saved to: {output_path}")
        print(f"   Size: {output_path.stat().st_size / 1024 / 1024:.2f} MB")
        print(f"   Columns: {list(df.columns)}")
        
        return {
            "name": config['name'],
            "output": config['output'],
            "rows": len(df),
            "columns": list(df.columns),
            "size_mb": output_path.stat().st_size / 1024 / 1024,
            "success": True
        }
        
    except Exception as e:
        print(f"❌ Error downloading {config['name']}: {e}")
        return {
            "name": config['name'],
            "output": config['output'],
            "error": str(e),
            "success": False
        }


def main():
    """Download all datasets"""
    print("""
╔═══════════════════════════════════════════════════════════╗
║  ClawKeeper Demo Data Download                            ║
║  Downloading 8 Hugging Face datasets                      ║
╚═══════════════════════════════════════════════════════════╝
    """)
    
    results = []
    
    # Download by priority
    for priority in [1, 2, 3]:
        priority_datasets = [d for d in DATASETS_CONFIG if d['priority'] == priority]
        
        print(f"\n\n🔹 Priority {priority} Datasets ({len(priority_datasets)} datasets)")
        print("─" * 60)
        
        for config in priority_datasets:
            result = download_dataset(config)
            results.append(result)
    
    # Save metadata
    metadata_path = RAW_DIR / "download_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump({
            "datasets": results,
            "total_downloaded": len([r for r in results if r['success']]),
            "total_failed": len([r for r in results if not r['success']]),
            "total_rows": sum(r.get('rows', 0) for r in results if r['success']),
            "total_size_mb": sum(r.get('size_mb', 0) for r in results if r['success'])
        }, f, indent=2)
    
    # Print summary
    print("\n\n" + "="*60)
    print("DOWNLOAD SUMMARY")
    print("="*60)
    
    successful = [r for r in results if r['success']]
    failed = [r for r in results if not r['success']]
    
    print(f"\n✅ Successful: {len(successful)}/{len(results)}")
    for r in successful:
        print(f"   • {r['output']}: {r['rows']:,} rows, {r['size_mb']:.2f} MB")
    
    if failed:
        print(f"\n❌ Failed: {len(failed)}")
        for r in failed:
            print(f"   • {r['name']}: {r['error']}")
    
    total_rows = sum(r.get('rows', 0) for r in successful)
    total_size = sum(r.get('size_mb', 0) for r in successful)
    
    print(f"\n📊 Total downloaded: {total_rows:,} rows, {total_size:.2f} MB")
    print(f"📁 Output directory: {RAW_DIR.absolute()}")
    print(f"📄 Metadata: {metadata_path.absolute()}")
    
    print("\n" + "="*60)
    print("Next steps:")
    print("  1. Run: bun run demo:transform")
    print("  2. Run: bun run demo:generate")
    print("  3. Run: bun run demo:seed")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
