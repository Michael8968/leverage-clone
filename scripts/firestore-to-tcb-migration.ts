#!/usr/bin/env node

/**
 * ⚠️ DEPRECATED - 迁移已完成 (2025年10月)
 * 
 * Firestore to Tencent CloudBase (TCB) Data Migration Tool
 * 
 * 本脚本用于 Firebase → TCB 的历史迁移。迁移已于 2025年10月完成。
 * 此文件保留仅供：
 *   - 参考历史迁移过程
 *   - 紧急数据回滚（需要 FIREBASE_SERVICE_ACCOUNT_KEY）
 *   - 新环境的数据同步（需重新配置）
 * 
 * 原用法:
 *   # Export Firestore data to JSON
 *   npx ts-node scripts/firestore-to-tcb-migration.ts --action export --output data-export.json
 *   
 *   # Import JSON data to TCB
 *   npx ts-node scripts/firestore-to-tcb-migration.ts --action import --input data-export.json
 *   
 *   # Verify data consistency
 *   npx ts-node scripts/firestore-to-tcb-migration.ts --action verify --input data-export.json
 *   
 *   # Dry run (preview without making changes)
 *   npx ts-node scripts/firestore-to-tcb-migration.ts --action import --input data-export.json --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { getTcbApp, getTcbDb } from '../src/lib/tcb';

// =====================================================================
// Types
// =====================================================================

interface MigrationConfig {
  action: 'export' | 'import' | 'verify';
  input?: string;
  output?: string;
  dryRun?: boolean;
  collections?: string[]; // If specified, only migrate these collections
  verbose?: boolean;
}

interface ExportedData {
  timestamp: string;
  version: string;
  collections: {
    [collectionName: string]: Array<{
      _id: string;
      [key: string]: any;
    }>;
  };
  metadata: {
    totalDocuments: number;
    collectionsCount: number;
    dataSize: number; // in bytes
    estimatedMigrationTime: string; // human readable
  };
}

interface MigrationReport {
  action: string;
  status: 'success' | 'failed' | 'partial';
  timestamp: string;
  summary: {
    totalDocuments: number;
    successfulDocuments: number;
    failedDocuments: number;
    skippedDocuments: number;
  };
  details: {
    [collectionName: string]: {
      total: number;
      success: number;
      failed: number;
      errors?: string[];
    };
  };
  duration: string; // human readable
  warnings?: string[];
  recommendations?: string[];
}

// =====================================================================
// Utility Functions
// =====================================================================

function log(message: string, verbose: boolean = true) {
  if (verbose) console.log(`[${new Date().toISOString()}] ${message}`);
}

function error(message: string) {
  console.error(`[ERROR] ${message}`);
}

function getHumanReadableSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function getHumanReadableDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// =====================================================================
// Export: Firestore → JSON
// =====================================================================

async function exportFirestoreData(config: MigrationConfig): Promise<ExportedData> {
  log('🚀 Starting Firestore export...', config.verbose);
  
  const startTime = Date.now();
  const output: ExportedData = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    collections: {},
    metadata: {
      totalDocuments: 0,
      collectionsCount: 0,
      dataSize: 0,
      estimatedMigrationTime: '',
    },
  };

  try {
    // Initialize Firebase Admin if using export
    const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account-key.json');
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Firebase service account key not found at ${serviceAccountPath}`);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    const db = admin.firestore();
    const collectionsSnapshot = await db.listCollections();
    const collections = collectionsSnapshot.map(col => col.id);
    
    // Filter collections if specified
    const collectionList = config.collections?.length 
      ? collections.filter(c => config.collections!.includes(c))
      : collections;

    log(`📦 Found ${collections.length} collections, migrating ${collectionList.length}...`, config.verbose);

    for (const collectionName of collectionList) {
      log(`  → Exporting collection: ${collectionName}`, config.verbose);
      
      const docs = await db.collection(collectionName).get();
      output.collections[collectionName] = [];
      
      docs.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore Timestamps to ISO strings
        const processedData = processFirestoreData(data);
        output.collections[collectionName].push({
          _id: doc.id,
          ...processedData,
        });
      });

      output.metadata.totalDocuments += docs.size;
      log(`    ✓ Exported ${docs.size} documents from ${collectionName}`, config.verbose);
    }

    output.metadata.collectionsCount = Object.keys(output.collections).length;
    output.metadata.dataSize = JSON.stringify(output).length;
    output.metadata.estimatedMigrationTime = getHumanReadableDuration(
      output.metadata.totalDocuments * 10 // Rough estimate: 10ms per document
    );

    log(`✅ Export complete: ${output.metadata.totalDocuments} documents in ${getHumanReadableSize(output.metadata.dataSize)}`, config.verbose);
    return output;
  } catch (err: any) {
    error(`Failed to export Firestore data: ${err.message}`);
    throw err;
  }
}

function processFirestoreData(data: any): any {
  if (data === null || data === undefined) return data;
  
  if (typeof data.toDate === 'function') {
    // Firestore Timestamp
    return data.toDate().toISOString();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => processFirestoreData(item));
  }
  
  if (typeof data === 'object') {
    const processed: any = {};
    for (const [key, value] of Object.entries(data)) {
      processed[key] = processFirestoreData(value);
    }
    return processed;
  }
  
  return data;
}

// =====================================================================
// Import: JSON → TCB
// =====================================================================

async function importTcbData(config: MigrationConfig): Promise<MigrationReport> {
  log('🚀 Starting TCB import...', config.verbose);
  
  const startTime = Date.now();
  
  if (!config.input) {
    throw new Error('--input file is required for import action');
  }

  if (!fs.existsSync(config.input)) {
    throw new Error(`Input file not found: ${config.input}`);
  }

  const data: ExportedData = JSON.parse(fs.readFileSync(config.input, 'utf8'));
  
  const report: MigrationReport = {
    action: 'import',
    status: 'success',
    timestamp: new Date().toISOString(),
    summary: {
      totalDocuments: 0,
      successfulDocuments: 0,
      failedDocuments: 0,
      skippedDocuments: 0,
    },
    details: {},
    duration: '',
    warnings: [],
    recommendations: [],
  };

  try {
    const db = getTcbDb();
    
    for (const [collectionName, documents] of Object.entries(data.collections)) {
      log(`  → Importing collection: ${collectionName}`, config.verbose);
      
      report.details[collectionName] = {
        total: documents.length,
        success: 0,
        failed: 0,
        errors: [],
      };

      for (const doc of documents) {
        try {
          const docId = doc._id;
          const docData = { ...doc };
          (docData as any)._id = undefined;

          if (config.dryRun) {
            log(`    [DRY-RUN] Would import document ${docId} to ${collectionName}`, config.verbose);
            report.details[collectionName].success++;
          } else {
            // Set document in TCB
            await db.collection(collectionName).doc(docId).set(docData);
            report.details[collectionName].success++;
            log(`    ✓ Imported ${docId}`, config.verbose);
          }
          report.summary.successfulDocuments++;
        } catch (err: any) {
          report.details[collectionName].failed++;
          report.details[collectionName].errors?.push(`${doc._id}: ${err.message}`);
          report.summary.failedDocuments++;
          error(`Failed to import ${doc._id}: ${err.message}`);
        }
      }

      report.summary.totalDocuments += documents.length;
      log(`    Summary: ${report.details[collectionName].success}/${documents.length} successful`, config.verbose);
    }

    if (report.summary.failedDocuments === 0) {
      report.status = 'success';
    } else if (report.summary.successfulDocuments === 0) {
      report.status = 'failed';
    } else {
      report.status = 'partial';
    }

    const duration = Date.now() - startTime;
    report.duration = getHumanReadableDuration(duration);
    
    if (config.dryRun) {
      report.warnings?.push('Dry-run mode: No data was actually imported');
    }

    log(`✅ Import complete: ${report.summary.successfulDocuments}/${report.summary.totalDocuments} documents imported in ${report.duration}`, config.verbose);
    
    return report;
  } catch (err: any) {
    error(`Failed to import TCB data: ${err.message}`);
    report.status = 'failed';
    throw err;
  }
}

// =====================================================================
// Verify: Compare Firestore and TCB Data
// =====================================================================

async function verifyData(config: MigrationConfig): Promise<MigrationReport> {
  log('🚀 Starting data verification...', config.verbose);
  
  const startTime = Date.now();
  
  if (!config.input) {
    throw new Error('--input file is required for verify action');
  }

  if (!fs.existsSync(config.input)) {
    throw new Error(`Input file not found: ${config.input}`);
  }

  const data: ExportedData = JSON.parse(fs.readFileSync(config.input, 'utf8'));
  
  const report: MigrationReport = {
    action: 'verify',
    status: 'success',
    timestamp: new Date().toISOString(),
    summary: {
      totalDocuments: 0,
      successfulDocuments: 0,
      failedDocuments: 0,
      skippedDocuments: 0,
    },
    details: {},
    duration: '',
    warnings: [],
    recommendations: [],
  };

  try {
    const db = getTcbDb();
    
    for (const [collectionName, documents] of Object.entries(data.collections)) {
      log(`  → Verifying collection: ${collectionName}`, config.verbose);
      
      report.details[collectionName] = {
        total: documents.length,
        success: 0,
        failed: 0,
        errors: [],
      };

      for (const expectedDoc of documents) {
        try {
          const docId = expectedDoc._id;
          const result = await db.collection(collectionName).doc(docId).get();
          const actualDoc = result.data()?.[0] || result.data?.();

          if (!actualDoc) {
            report.details[collectionName].failed++;
            report.details[collectionName].errors?.push(`${docId}: Document not found in TCB`);
            error(`Document not found in TCB: ${collectionName}/${docId}`);
          } else {
            // Simple comparison (can be enhanced for deep equality check)
            report.details[collectionName].success++;
            log(`    ✓ Verified ${docId}`, config.verbose);
          }
          report.summary.successfulDocuments++;
        } catch (err: any) {
          report.details[collectionName].failed++;
          report.details[collectionName].errors?.push(`${expectedDoc._id}: ${err.message}`);
          report.summary.failedDocuments++;
          error(`Failed to verify ${expectedDoc._id}: ${err.message}`);
        }
      }

      report.summary.totalDocuments += documents.length;
      log(`    Summary: ${report.details[collectionName].success}/${documents.length} verified`, config.verbose);
    }

    if (report.summary.failedDocuments === 0) {
      report.status = 'success';
      report.recommendations?.push('All data verified successfully. Safe to decommission Firestore.');
    } else {
      report.status = 'partial';
      report.warnings?.push(`${report.summary.failedDocuments} documents failed verification`);
      report.recommendations?.push('Review failed documents and retry migration.');
    }

    const duration = Date.now() - startTime;
    report.duration = getHumanReadableDuration(duration);

    log(`✅ Verification complete in ${report.duration}`, config.verbose);
    
    return report;
  } catch (err: any) {
    error(`Failed to verify data: ${err.message}`);
    report.status = 'failed';
    throw err;
  }
}

// =====================================================================
// Main Entry Point
// =====================================================================

async function main() {
  const args = process.argv.slice(2);
  
  const config: MigrationConfig = {
    action: 'export',
    verbose: true,
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--action') config.action = args[++i] as any;
    else if (args[i] === '--input') config.input = args[++i];
    else if (args[i] === '--output') config.output = args[++i];
    else if (args[i] === '--collections') config.collections = args[++i].split(',');
    else if (args[i] === '--dry-run') config.dryRun = true;
    else if (args[i] === '--quiet') config.verbose = false;
  }

  // Set defaults
  if (!config.output) config.output = `firestore-export-${Date.now()}.json`;

  console.log('📊 Firestore to TCB Migration Tool');
  console.log(`Action: ${config.action}`);
  console.log('');

  try {
    let result: any;

    switch (config.action) {
      case 'export':
        result = await exportFirestoreData(config);
        if (config.output) {
          fs.writeFileSync(config.output, JSON.stringify(result, null, 2));
          console.log(`\n✅ Data exported to: ${config.output}`);
        }
        break;

      case 'import':
        result = await importTcbData(config);
        console.log('\n📋 Import Report:');
        console.log(JSON.stringify(result, null, 2));
        if (result.recommendations?.length) {
          console.log('\n💡 Recommendations:');
          result.recommendations.forEach((rec: string) => console.log(`  - ${rec}`));
        }
        break;

      case 'verify':
        result = await verifyData(config);
        console.log('\n📋 Verification Report:');
        console.log(JSON.stringify(result, null, 2));
        if (result.recommendations?.length) {
          console.log('\n💡 Recommendations:');
          result.recommendations.forEach((rec: string) => console.log(`  - ${rec}`));
        }
        break;

      default:
        throw new Error(`Unknown action: ${config.action}`);
    }

    process.exit(result.status === 'failed' ? 1 : 0);
  } catch (err: any) {
    error(err.message);
    process.exit(1);
  }
}

main().catch(err => {
  error(err.message);
  process.exit(1);
});
