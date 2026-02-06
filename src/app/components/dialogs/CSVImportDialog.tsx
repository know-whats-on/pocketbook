import { useState } from 'react';
import { db } from '../../lib/db';
import { X, Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CSVImportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ColumnMapping {
  csvColumn: string;
  dbField: string;
}

const PEOPLE_FIELD_OPTIONS = [
  { value: 'name', label: 'Name *' },
  { value: 'pronouns', label: 'Pronouns' },
  { value: 'company', label: 'Company' },
  { value: 'role', label: 'Role' },
  { value: 'linkedInUrl', label: 'LinkedIn URL' },
  { value: 'notes', label: 'Notes' },
  { value: 'tags', label: 'Tags (semicolon-separated)' },
  { value: '---skip---', label: '(Skip this column)' }
];

export function CSVImportDialog({ open, onClose }: CSVImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'confirm' | 'result'>('upload');
  const [csvData, setCSVData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: number } | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const { headers: csvHeaders, rows } = parseCSV(text);
      
      setHeaders(csvHeaders);
      setCSVData(rows);
      
      // Auto-detect mappings
      const autoMappings = autoDetectMappings(csvHeaders);
      setMappings(autoMappings);
      
      setStep('mapping');
    } catch (error) {
      toast.error('Failed to parse CSV file');
      console.error(error);
    }

    // Reset file input
    event.target.value = '';
  };

  const parseCSV = (text: string): { headers: string[]; rows: any[] } => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) throw new Error('Empty CSV file');

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return { headers, rows };
  };

  const autoDetectMappings = (csvHeaders: string[]): ColumnMapping[] => {
    return csvHeaders.map(header => {
      const lowerHeader = header.toLowerCase();
      
      // Auto-detect common field names
      if (lowerHeader.includes('name') || lowerHeader === 'displayname') {
        return { csvColumn: header, dbField: 'name' };
      }
      if (lowerHeader.includes('pronoun')) {
        return { csvColumn: header, dbField: 'pronouns' };
      }
      if (lowerHeader.includes('company') || lowerHeader.includes('organization')) {
        return { csvColumn: header, dbField: 'company' };
      }
      if (lowerHeader.includes('role') || lowerHeader.includes('title') || lowerHeader.includes('position')) {
        return { csvColumn: header, dbField: 'role' };
      }
      if (lowerHeader.includes('linkedin') || lowerHeader.includes('url')) {
        return { csvColumn: header, dbField: 'linkedInUrl' };
      }
      if (lowerHeader.includes('note') || lowerHeader.includes('description')) {
        return { csvColumn: header, dbField: 'notes' };
      }
      if (lowerHeader.includes('tag')) {
        return { csvColumn: header, dbField: 'tags' };
      }
      
      return { csvColumn: header, dbField: '---skip---' };
    });
  };

  const updateMapping = (csvColumn: string, dbField: string) => {
    setMappings(prev =>
      prev.map(m => (m.csvColumn === csvColumn ? { ...m, dbField } : m))
    );
  };

  const handleImport = async () => {
    setImporting(true);
    setStep('confirm');

    let created = 0;
    let updated = 0;
    let errors = 0;

    try {
      for (const row of csvData) {
        try {
          const personData: any = {
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Map CSV columns to database fields
          for (const mapping of mappings) {
            if (mapping.dbField === '---skip---') continue;
            
            let value = row[mapping.csvColumn];
            
            // Handle tags (semicolon-separated)
            if (mapping.dbField === 'tags' && value) {
              value = value.split(';').map((t: string) => t.trim()).filter(Boolean);
            }
            
            if (value) {
              personData[mapping.dbField] = value;
            }
          }

          // Validate required fields
          if (!personData.name) {
            errors++;
            continue;
          }

          // Check for duplicates
          let existing = null;
          
          if (personData.linkedInUrl) {
            existing = await db.people
              .toArray()
              .then(people => people.find(p => p.linkedInUrl === personData.linkedInUrl));
          }
          
          if (!existing && personData.name && personData.company) {
            existing = await db.people
              .toArray()
              .then(people => people.find(p => 
                p.name.toLowerCase() === personData.name.toLowerCase() &&
                p.company?.toLowerCase() === personData.company?.toLowerCase()
              ));
          }

          if (existing) {
            await db.people.update(existing.id!, { ...personData, id: existing.id, updatedAt: new Date() });
            updated++;
          } else {
            await db.people.add(personData);
            created++;
          }
        } catch (error) {
          console.error('Error importing row:', error);
          errors++;
        }
      }

      setImportResult({ created, updated, errors });
      setStep('result');
      
      if (errors === 0) {
        toast.success(`Imported ${created + updated} people (${created} new, ${updated} updated)`);
      } else {
        toast.warning(`Imported ${created + updated} people with ${errors} errors`);
      }
    } catch (error) {
      toast.error('Import failed');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setCSVData([]);
    setHeaders([]);
    setMappings([]);
    setImportResult(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-medium">Import People from CSV</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 'upload' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
              <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
                Upload a CSV file containing people data. The first row should contain column headers.
              </p>
              
              <label className="inline-block">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="bg-green-900 hover:bg-green-800 text-green-100 px-6 py-3 rounded-lg cursor-pointer transition-colors font-medium">
                  Choose CSV File
                </div>
              </label>

              <div className="mt-8 text-left max-w-md mx-auto">
                <p className="text-xs text-zinc-500 mb-2">Expected columns (any order):</p>
                <ul className="text-xs text-zinc-600 space-y-1">
                  <li>• Name (required)</li>
                  <li>• Company, Role, Pronouns</li>
                  <li>• LinkedIn URL</li>
                  <li>• Notes, Tags (semicolon-separated)</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div>
              <p className="text-sm text-zinc-400 mb-4">
                Map your CSV columns to PocketNetwork fields. We've auto-detected some mappings.
              </p>

              <div className="space-y-2">
                {mappings.map((mapping, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-200">{mapping.csvColumn}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Sample: {csvData[0]?.[mapping.csvColumn] || '(empty)'}
                      </p>
                    </div>
                    <div className="text-zinc-500">→</div>
                    <div className="flex-1">
                      <select
                        value={mapping.dbField}
                        onChange={(e) => updateMapping(mapping.csvColumn, e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200"
                      >
                        {PEOPLE_FIELD_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-3 bg-blue-950/30 border border-blue-900/50 rounded-lg">
                <p className="text-sm text-blue-200">
                  <strong>{csvData.length}</strong> rows ready to import
                </p>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-950/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Upload className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-zinc-300">Importing {csvData.length} people...</p>
            </div>
          )}

          {step === 'result' && importResult && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-medium mb-4">Import Complete</h3>
              
              <div className="max-w-sm mx-auto space-y-2">
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <span className="text-sm text-zinc-400">Created</span>
                  <span className="text-lg font-medium text-green-400">{importResult.created}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <span className="text-sm text-zinc-400">Updated</span>
                  <span className="text-lg font-medium text-blue-400">{importResult.updated}</span>
                </div>
                {importResult.errors > 0 && (
                  <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <span className="text-sm text-zinc-400">Errors</span>
                    <span className="text-lg font-medium text-red-400">{importResult.errors}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex gap-2 justify-end">
          {step === 'mapping' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={!mappings.some(m => m.dbField === 'name')}
                className="px-4 py-2 bg-green-900 hover:bg-green-800 text-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {csvData.length} People
              </button>
            </>
          )}
          {step === 'result' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-blue-100 rounded-lg transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
