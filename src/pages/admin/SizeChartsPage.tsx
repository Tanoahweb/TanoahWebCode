import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Ruler,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Eye,
  Check,
  Search,
  ArrowUp,
  ArrowDown,
  Info,
  Layers,
  Sparkles,
  ExternalLink,
  Package,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useUIStore } from '../../store/useUIStore';
import { api } from '../../services/api';
import { SizeChart } from '../../types';

export const SizeChartsPage: React.FC = () => {
  const { addToast } = useUIStore();
  const [charts, setCharts] = useState<SizeChart[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [chartName, setChartName] = useState('');
  const [chartDescription, setChartDescription] = useState('');
  const [columns, setColumns] = useState<string[]>(['Size', 'Chest (in)', 'Shoulder (in)', 'Length (in)']);
  const [rows, setRows] = useState<string[][]>([
    ['S', '38 - 40', '18.5', '28.0'],
    ['M', '41 - 43', '19.5', '29.0'],
    ['L', '44 - 46', '20.5', '30.0'],
    ['XL', '47 - 49', '21.5', '31.0'],
  ]);
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [showAddColumnInput, setShowAddColumnInput] = useState(false);

  // Preview Modal State
  const [previewChart, setPreviewChart] = useState<SizeChart | null>(null);

  // Delete Confirmation State
  const [deletingChart, setDeletingChart] = useState<SizeChart | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCharts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSizeCharts();
      setCharts(data);
    } catch (e) {
      console.error('Failed to load size charts:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCharts();

    const handleUpdate = () => {
      loadCharts();
    };
    window.addEventListener('tanoah_size_charts_updated', handleUpdate);
    return () => {
      window.removeEventListener('tanoah_size_charts_updated', handleUpdate);
    };
  }, []);

  const openNewChartModal = () => {
    setEditingChartId(null);
    setChartName('');
    setChartDescription(
      'All measurements are tailored in inches. If you are between sizes, we recommend sizing up for a relaxed luxury drape.'
    );
    setColumns(['Size', 'Chest (in)', 'Shoulder (in)', 'Length (in)']);
    setRows([
      ['S', '38 - 40', '18.5', '28.0'],
      ['M', '41 - 43', '19.5', '29.0'],
      ['L', '44 - 46', '20.5', '30.0'],
      ['XL', '47 - 49', '21.5', '31.0'],
    ]);
    setIsDefault(charts.length === 0);
    setShowAddColumnInput(false);
    setNewColumnName('');
    setIsEditorOpen(true);
  };

  const openEditChartModal = (chart: SizeChart) => {
    setEditingChartId(chart.id);
    setChartName(chart.name);
    setChartDescription(
      chart.description ||
        'All measurements are tailored in inches. If you are between sizes, we recommend sizing up for a relaxed luxury drape.'
    );
    setColumns([...chart.columns]);
    setRows(chart.rows.map((r) => [...r]));
    setIsDefault(Boolean(chart.is_default));
    setShowAddColumnInput(false);
    setNewColumnName('');
    setIsEditorOpen(true);
  };

  const handleDuplicateChart = async (chart: SizeChart) => {
    try {
      const duplicate: SizeChart = {
        id: `sc_${Date.now()}`,
        name: `${chart.name} (Copy)`,
        description: chart.description,
        columns: [...chart.columns],
        rows: chart.rows.map((r) => [...r]),
        is_default: false,
      };
      await api.saveSizeChart(duplicate);
      addToast({
        type: 'success',
        title: 'Size Chart Duplicated',
        description: `Created copy: "${duplicate.name}".`,
      });
      loadCharts();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Duplicate Failed',
        description: err.message || 'Could not copy size chart.',
      });
    }
  };

  // Column Headings Management
  const handleAddColumn = () => {
    const trimmed = newColumnName.trim();
    if (!trimmed) return;
    if (columns.map((c) => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      addToast({ type: 'error', title: 'Column Exists', description: 'A column with this heading already exists.' });
      return;
    }

    setColumns((prev) => [...prev, trimmed]);
    // Append an empty value to each existing row
    setRows((prev) => prev.map((row) => [...row, '']));
    setNewColumnName('');
    setShowAddColumnInput(false);
  };

  const handleUpdateColumnHeading = (index: number, newHeading: string) => {
    setColumns((prev) => {
      const copy = [...prev];
      copy[index] = newHeading;
      return copy;
    });
  };

  const handleDeleteColumn = (index: number) => {
    if (columns.length <= 1) {
      addToast({ type: 'error', title: 'Cannot Delete', description: 'A size chart must have at least 1 column.' });
      return;
    }
    setColumns((prev) => prev.filter((_, i) => i !== index));
    setRows((prev) => prev.map((row) => row.filter((_, i) => i !== index)));
  };

  // Row Values Management
  const handleAddRow = () => {
    const newRow = new Array(columns.length).fill('');
    setRows((prev) => [...prev, newRow]);
  };

  const handleUpdateCell = (rowIndex: number, colIndex: number, value: string) => {
    setRows((prev) => {
      const newRows = prev.map((r) => [...r]);
      if (!newRows[rowIndex]) {
        newRows[rowIndex] = new Array(columns.length).fill('');
      }
      newRows[rowIndex][colIndex] = value;
      return newRows;
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (rows.length <= 1) {
      addToast({ type: 'error', title: 'Cannot Delete', description: 'A size chart must have at least 1 row.' });
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== rowIndex));
  };

  const handleMoveRow = (rowIndex: number, direction: 'up' | 'down') => {
    if (direction === 'up' && rowIndex === 0) return;
    if (direction === 'down' && rowIndex === rows.length - 1) return;

    setRows((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? rowIndex - 1 : rowIndex + 1;
      const temp = copy[rowIndex];
      copy[rowIndex] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleSaveChart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chartName.trim()) {
      addToast({ type: 'error', title: 'Name Required', description: 'Please enter a name for this size chart.' });
      return;
    }
    if (columns.length === 0) {
      addToast({ type: 'error', title: 'Headings Required', description: 'Add at least one column heading.' });
      return;
    }

    setIsSaving(true);
    try {
      const chartPayload: SizeChart = {
        id: editingChartId || `sc_${Date.now()}`,
        name: chartName.trim(),
        description: chartDescription.trim(),
        columns: columns.map((c) => c.trim() || 'Measurement'),
        rows: rows.map((r) => {
          // Ensure row length matches columns length
          const cleanRow = [...r];
          while (cleanRow.length < columns.length) cleanRow.push('');
          return cleanRow.slice(0, columns.length);
        }),
        is_default: isDefault,
      };

      const success = await api.saveSizeChart(chartPayload);
      if (success) {
        addToast({
          type: 'success',
          title: editingChartId ? 'Size Chart Updated' : 'Size Chart Created',
          description: `"${chartPayload.name}" saved successfully.`,
        });
        setIsEditorOpen(false);
        loadCharts();
      } else {
        throw new Error('Database save failed');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: err.message || 'Could not save size chart.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingChart) return;
    setIsDeleting(true);
    try {
      const success = await api.deleteSizeChart(deletingChart.id);
      if (success) {
        addToast({
          type: 'success',
          title: 'Size Chart Deleted',
          description: `"${deletingChart.name}" has been removed.`,
        });
        setDeletingChart(null);
        loadCharts();
      } else {
        throw new Error('Delete failed');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        description: err.message || 'Could not delete size chart.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCharts = charts.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.columns.some((col) => col.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="p-6 sm:p-8 space-y-6 text-left font-poppins">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E7E7E7]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#3F3F8F] font-semibold tracking-widest uppercase">
                CATALOG & APPAREL SPECIFICATIONS
              </span>
            </div>
            <h1 className="font-wondra text-2xl sm:text-3xl text-black mt-1">
              SIZE CHARTS & FIT GUIDES
            </h1>
            <p className="text-xs text-[#666666] mt-1 max-w-2xl">
              Create, edit, and assign custom measurement tables for your shirts, trousers, dresses, and sarees. Products will display the exact assigned guide when customers click "Size & Fit Guide".
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/admin/products">
              <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>View Products</span>
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={openNewChartModal}
              className="text-xs bg-[#3F3F8F] hover:bg-[#333377] text-white flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Size Chart</span>
            </Button>
          </div>
        </div>

        {/* Search & Info Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search size charts by name or column..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-[#E7E7E7] rounded-[4px] py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-[#3F3F8F]"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="text-xs text-[#666666] flex items-center gap-2">
            <Info className="w-4 h-4 text-[#3F3F8F] shrink-0" />
            <span>The default chart automatically applies to products without a specific chart selected.</span>
          </div>
        </div>

        {/* Size Charts Table */}
        <div className="bg-white border border-[#E7E7E7] rounded-[4px] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] text-[#888888] uppercase font-semibold">
                <tr>
                  <th className="p-4">Chart Name & Status</th>
                  <th className="p-4">Column Headings</th>
                  <th className="p-4">Sizes Included</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7E7] text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-neutral-400">
                      Loading size charts...
                    </td>
                  </tr>
                ) : filteredCharts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center space-y-3">
                      <Ruler className="w-8 h-8 text-neutral-300 mx-auto" />
                      <p className="font-semibold text-black">No size charts found</p>
                      <p className="text-xs text-[#888888]">
                        {searchTerm ? 'Try a different search term.' : 'Get started by creating your first custom size chart.'}
                      </p>
                      <Button variant="outline" size="sm" onClick={openNewChartModal} className="text-xs">
                        + Create Size Chart
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredCharts.map((chart) => (
                    <tr key={chart.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="p-4 max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-black text-sm">{chart.name}</span>
                          {chart.is_default && (
                            <span className="bg-[#EEEEF8] text-[#3F3F8F] text-[9px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        {chart.description && (
                          <p className="text-[11px] text-[#666666] line-clamp-1 mt-0.5">
                            {chart.description}
                          </p>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5 max-w-sm">
                          {chart.columns.map((col, idx) => (
                            <span
                              key={idx}
                              className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-[10px] font-medium"
                            >
                              {col}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-black">
                            {chart.rows.length} size{chart.rows.length === 1 ? '' : 's'}
                          </span>
                          <div className="text-[11px] text-neutral-500 font-mono">
                            {chart.rows.map((r) => r[0]).filter(Boolean).join(', ') || '—'}
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewChart(chart)}
                            className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded transition-colors cursor-pointer"
                            title="Preview customer design"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateChart(chart)}
                            className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded transition-colors cursor-pointer"
                            title="Duplicate chart"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditChartModal(chart)}
                            className="p-1.5 text-neutral-500 hover:text-[#3F3F8F] hover:bg-[#EEEEF8] rounded transition-colors cursor-pointer"
                            title="Edit size chart"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingChart(chart)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete size chart"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SIZE CHART EDITOR MODAL */}
        {/* ========================================================================= */}
        <Modal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          title={editingChartId ? 'EDIT SIZE CHART' : 'CREATE NEW SIZE CHART'}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveChart} className="space-y-6 text-left font-poppins text-xs">
            {/* Top metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Chart Name / Apparel Group *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. French Linen Shirts & Kurtas"
                  value={chartName}
                  onChange={(e) => setChartName(e.target.value)}
                  className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="is_default_checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 accent-[#3F3F8F] cursor-pointer rounded"
                />
                <label htmlFor="is_default_checkbox" className="text-xs text-black font-medium cursor-pointer">
                  Set as Default Size Chart (auto-assigns to new apparel)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Measurement Subtext / Sizing Guidance
              </label>
              <textarea
                rows={2}
                placeholder="e.g. All measurements are tailored in inches. If you are between sizes, we recommend sizing up for a relaxed luxury drape."
                value={chartDescription}
                onChange={(e) => setChartDescription(e.target.value)}
                className="w-full p-2.5 border border-[#E7E7E7] rounded-[4px] focus:outline-none focus:border-[#3F3F8F] text-xs"
              />
            </div>

            {/* Column Headings Management */}
            <div className="space-y-2 pt-2 border-t border-[#E7E7E7]">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase">
                    Measurement Column Headings ({columns.length})
                  </label>
                  <p className="text-[10px] text-[#888888]">
                    Click any heading name below to edit it directly. Add or delete measurement dimensions.
                  </p>
                </div>
                {!showAddColumnInput && (
                  <button
                    type="button"
                    onClick={() => setShowAddColumnInput(true)}
                    className="text-[11px] text-[#3F3F8F] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Column</span>
                  </button>
                )}
              </div>

              {/* Add Column Input Bar */}
              {showAddColumnInput && (
                <div className="flex items-center gap-2 bg-[#FAFAFA] p-2.5 rounded border border-[#E7E7E7]">
                  <input
                    type="text"
                    placeholder="e.g. Sleeve (in) or Waist (cm)"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddColumn();
                      }
                    }}
                    autoFocus
                    className="flex-1 p-2 bg-white border border-[#E7E7E7] rounded text-xs focus:outline-none focus:border-[#3F3F8F]"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    type="button"
                    onClick={handleAddColumn}
                    className="text-xs bg-[#3F3F8F] text-white"
                  >
                    Add
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setShowAddColumnInput(false);
                      setNewColumnName('');
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Headings Pill Editor */}
              <div className="flex flex-wrap gap-2 pt-1">
                {columns.map((col, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 bg-[#FAFAFA] border border-[#E7E7E7] rounded px-2.5 py-1 text-xs"
                  >
                    <span className="text-[9px] font-mono text-neutral-400 font-semibold">#{idx + 1}</span>
                    <input
                      type="text"
                      value={col}
                      onChange={(e) => handleUpdateColumnHeading(idx, e.target.value)}
                      className="w-24 sm:w-28 bg-transparent text-xs font-semibold text-black focus:outline-none focus:underline"
                    />
                    {columns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteColumn(idx)}
                        className="text-neutral-400 hover:text-red-600 transition-colors ml-1 cursor-pointer"
                        title="Delete column"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows & Values Grid Editor */}
            <div className="space-y-2 pt-2 border-t border-[#E7E7E7]">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase">
                    Size Rows & Values Grid ({rows.length} Sizes)
                  </label>
                  <p className="text-[10px] text-[#888888]">
                    Enter size labels (e.g. S, M, L, XL, 32, 34) in the first column and measurements in the rest.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="text-[11px] text-[#3F3F8F] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Size Row</span>
                </button>
              </div>

              {/* Grid Table */}
              <div className="border border-[#E7E7E7] rounded-[4px] overflow-x-auto">
                <table className="w-full text-left min-w-[500px]">
                  <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[10px] font-semibold uppercase text-neutral-700">
                    <tr>
                      <th className="p-2.5 w-12 text-center text-neutral-400">#</th>
                      {columns.map((col, cIdx) => (
                        <th key={cIdx} className="p-2.5 font-semibold text-black">
                          {col}
                        </th>
                      ))}
                      <th className="p-2.5 w-20 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E7E7]">
                    {rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-neutral-50/50">
                        <td className="p-2 text-center text-[10px] font-mono text-neutral-400">
                          {rIdx + 1}
                        </td>
                        {columns.map((_, cIdx) => (
                          <td key={cIdx} className="p-1.5">
                            <input
                              type="text"
                              value={row[cIdx] || ''}
                              onChange={(e) => handleUpdateCell(rIdx, cIdx, e.target.value)}
                              placeholder={cIdx === 0 ? 'e.g. M' : 'e.g. 40 - 42'}
                              className={`w-full p-2 border border-[#E7E7E7] rounded text-xs focus:outline-none focus:border-[#3F3F8F] ${
                                cIdx === 0 ? 'font-semibold text-black' : 'text-neutral-700'
                              }`}
                            />
                          </td>
                        ))}
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveRow(rIdx, 'up')}
                              disabled={rIdx === 0}
                              className="p-1 text-neutral-400 hover:text-black disabled:opacity-20 cursor-pointer"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveRow(rIdx, 'down')}
                              disabled={rIdx === rows.length - 1}
                              className="p-1 text-neutral-400 hover:text-black disabled:opacity-20 cursor-pointer"
                              title="Move down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(rIdx)}
                              className="p-1 text-neutral-400 hover:text-red-600 ml-1 cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* EXACT CUSTOMER-FACING DESIGN PREVIEW */}
            {/* ========================================================================= */}
            <div className="space-y-2 pt-3 border-t border-[#E7E7E7]">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#3F3F8F]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#3F3F8F]">
                  Customer Modal Live Preview (Preserves Current Design)
                </span>
              </div>

              <div className="p-4 bg-[#FAFAFA] border border-[#E7E7E7] rounded-[4px] space-y-3">
                <p className="text-xs text-[#666666] leading-relaxed">
                  {chartDescription ||
                    'All measurements are tailored in inches. If you are between sizes, we recommend sizing up for a relaxed luxury drape.'}
                </p>
                <div className="overflow-x-auto border border-[#E7E7E7] rounded-[4px] bg-white">
                  <table className="w-full text-left">
                    <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[11px] font-semibold uppercase">
                      <tr>
                        {columns.map((col, idx) => (
                          <th key={idx} className="p-3">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E7E7]">
                      {rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {columns.map((_, cIdx) => (
                            <td
                              key={cIdx}
                              className={`p-3 ${cIdx === 0 ? 'font-semibold text-black' : 'text-[#444444]'}`}
                            >
                              {row[cIdx] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-[#E7E7E7]">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={isSaving}
                className="text-xs bg-[#3F3F8F] hover:bg-[#333377] text-white"
              >
                {isSaving ? 'Saving...' : 'Save Size Chart'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* ========================================================================= */}
        {/* PREVIEW MODAL */}
        {/* ========================================================================= */}
        <Modal
          isOpen={Boolean(previewChart)}
          onClose={() => setPreviewChart(null)}
          title={`SIZE GUIDE · ${previewChart?.name.toUpperCase() || ''}`}
          maxWidth="lg"
        >
          {previewChart && (
            <div className="space-y-4 text-xs font-poppins text-left">
              <p className="text-[#666666] leading-relaxed">
                {previewChart.description ||
                  'All measurements are tailored in inches. If you are between sizes, we recommend sizing up for a relaxed luxury drape.'}
              </p>
              <div className="overflow-x-auto border border-[#E7E7E7] rounded-[4px] bg-white">
                <table className="w-full text-left">
                  <thead className="bg-[#F8F8F8] border-b border-[#E7E7E7] text-[11px] font-semibold uppercase">
                    <tr>
                      {previewChart.columns.map((col, idx) => (
                        <th key={idx} className="p-3">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E7E7]">
                    {previewChart.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {previewChart.columns.map((_, cIdx) => (
                          <td
                            key={cIdx}
                            className={`p-3 ${cIdx === 0 ? 'font-semibold text-black' : 'text-[#444444]'}`}
                          >
                            {row[cIdx] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] text-neutral-400">
                  {previewChart.is_default ? '★ Active Default Size Chart' : 'Custom Silhouette Chart'}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const c = previewChart;
                    setPreviewChart(null);
                    openEditChartModal(c);
                  }}
                  className="text-xs bg-[#3F3F8F] text-white"
                >
                  Edit This Chart
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* ========================================================================= */}
        {/* DELETE CONFIRMATION MODAL */}
        {/* ========================================================================= */}
        <Modal
          isOpen={Boolean(deletingChart)}
          onClose={() => setDeletingChart(null)}
          title="DELETE SIZE CHART"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs font-poppins text-left">
            <p className="text-[#444444]">
              Are you sure you want to delete size chart <strong>"{deletingChart?.name}"</strong>? Products assigned to this chart will fall back to the store default.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingChart(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="text-xs bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete Size Chart'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};
