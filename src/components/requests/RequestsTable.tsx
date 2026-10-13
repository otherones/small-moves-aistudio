import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MoreVertical,
  Eye,
  Edit3,
  CreditCard,
  XCircle,
  MessageSquare,
  CheckCircle2,
  ArrowUpRight,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  PhoneCall,
  Send,
  UserCheck,
} from 'lucide-react';
import { EmergencyRequest } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { getSchoolYearForDate } from '../../utils/schoolYear';
import { CancelRequestModal } from './CancelRequestModal';

interface RequestsTableProps {
  requests: EmergencyRequest[];
  isAdminView?: boolean;
  onCancelRequest?: (request: EmergencyRequest, reason?: string) => void;
  onEditRequest?: (request: EmergencyRequest) => void;
  onEditPayout?: (request: EmergencyRequest) => void;
  onApproveRequest?: (request: EmergencyRequest) => void;
  onRequestChanges?: (request: EmergencyRequest) => void;
  onDenyRequest?: (request: EmergencyRequest) => void;
  onMarkAsPaid?: (request: EmergencyRequest) => void;
  onResolvePrincipalTask?: (request: EmergencyRequest) => void;
  onResendBeneficiaryConfirmation?: (request: EmergencyRequest) => void;
  onConfirmBeneficiary?: (request: EmergencyRequest) => void;
  onResendPrincipalReminder?: (request: EmergencyRequest) => void;
  defaultPageSize?: number;
}

type SortField =
  | 'id'
  | 'createdAt'
  | 'schoolName'
  | 'submitterName'
  | 'studentName'
  | 'beneficiaryName'
  | 'payoutMethodName'
  | 'amount'
  | 'status'
  | 'updatedAt';

type SortDirection = 'asc' | 'desc';

export const RequestsTable: React.FC<RequestsTableProps> = ({
  requests,
  isAdminView = false,
  onCancelRequest,
  onEditRequest,
  onEditPayout,
  onApproveRequest,
  onRequestChanges,
  onDenyRequest,
  onMarkAsPaid,
  onResolvePrincipalTask,
  onResendBeneficiaryConfirmation,
  onConfirmBeneficiary,
  onResendPrincipalReminder,
  defaultPageSize = 10,
}) => {
  const navigate = useNavigate();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [requestToCancel, setRequestToCancel] = useState<EmergencyRequest | null>(null);

  // Sorting & Pagination State
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);

  // Column Resizing State
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const dragState = React.useRef<{ field: string; startX: number; startWidth: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, field: string) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.target as HTMLElement).closest('th');
    if (th) {
      dragState.current = {
        field,
        startX: e.clientX,
        startWidth: th.getBoundingClientRect().width,
      };
      document.body.style.cursor = 'col-resize';
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.current) {
        const { field, startX, startWidth } = dragState.current;
        const newWidth = Math.max(50, startWidth + (e.clientX - startX));
        setColWidths(prev => ({ ...prev, [field]: newWidth }));
      }
    };

    const handleMouseUp = () => {
      if (dragState.current) {
        dragState.current = null;
        document.body.style.cursor = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Reset to page 1 whenever requests prop or filter changes significantly
  useEffect(() => {
    setCurrentPage(1);
  }, [requests.length]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'amount' || field === 'createdAt' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'id':
          return sortDirection === 'asc'
            ? (a.id || '').localeCompare(b.id || '', undefined, { numeric: true })
            : (b.id || '').localeCompare(a.id || '', undefined, { numeric: true });
        case 'schoolName':
          aVal = (a.schoolName || '').toLowerCase();
          bVal = (b.schoolName || '').toLowerCase();
          break;
        case 'beneficiaryName':
          aVal = (a.beneficiaryName || '').toLowerCase();
          bVal = (b.beneficiaryName || '').toLowerCase();
          break;
        case 'studentName':
          aVal = (a.studentName || '').toLowerCase();
          bVal = (b.studentName || '').toLowerCase();
          break;
        case 'submitterName':
          aVal = (a.submitterName || '').toLowerCase();
          bVal = (b.submitterName || '').toLowerCase();
          break;
        case 'payoutMethodName':
          aVal = (a.payoutDetails?.payoutMethodName || '').toLowerCase();
          bVal = (b.payoutDetails?.payoutMethodName || '').toLowerCase();
          break;
        case 'amount':
          aVal = a.amount || 0;
          bVal = b.amount || 0;
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'status':
          aVal = (a.status || '').toLowerCase();
          bVal = (b.status || '').toLowerCase();
          break;
        case 'updatedAt':
          aVal = new Date(a.updatedAt).getTime();
          bVal = new Date(b.updatedAt).getTime();
          break;
        default:
          aVal = 0;
          bVal = 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [requests, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedRequests.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedRequests = useMemo(() => {
    return sortedRequests.slice(startIndex, startIndex + pageSize);
  }, [sortedRequests, startIndex, pageSize]);

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
          <Filter className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">No requests found</h4>
        <p className="text-xs text-slate-500 mt-1">
          No emergency requests match the current filter or query criteria.
        </p>
      </div>
    );
  }

  const renderSortHeader = (label: string, field: SortField, alignRight = false) => {
    const isSorted = sortField === field;
    return (
      <th 
        className={`py-3.5 px-3 select-none relative group/header ${alignRight ? 'text-right' : ''}`}
        style={{ width: colWidths[field], minWidth: colWidths[field] }}
      >
        <button
          type="button"
          onClick={() => handleSort(field)}
          className={`inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors cursor-pointer group font-semibold uppercase tracking-wider text-xs ${
            alignRight ? 'justify-end w-full' : ''
          } ${isSorted ? 'text-slate-900' : 'text-slate-500'}`}
        >
          <span>{label}</span>
          <span className="text-slate-400 group-hover:text-slate-700">
            {isSorted ? (
              sortDirection === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-[#0089B3] font-bold" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-[#0089B3] font-bold" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
            )}
          </span>
        </button>
        <div
          onMouseDown={(e) => handleMouseDown(e, field)}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-slate-300 opacity-0 group-hover/header:opacity-100 z-10 transition-colors"
        />
      </th>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto" style={{ minHeight: sortedRequests.length <= 3 ? '240px' : 'auto' }}>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {renderSortHeader('Request ID', 'id')}
              {isAdminView && renderSortHeader('School', 'schoolName')}
              {renderSortHeader('Student', 'studentName')}
              {renderSortHeader('Beneficiary', 'beneficiaryName')}
              {renderSortHeader('Payment Method', 'payoutMethodName')}
              {renderSortHeader('Amount', 'amount', true)}
              {renderSortHeader('Status', 'status')}
              {renderSortHeader('Last Action', 'updatedAt')}
              <th className="py-3.5 px-3 text-right font-bold uppercase tracking-wider text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRequests.map((req, idx) => {
              const isMenuOpen = activeMenuId === req.id;
              const isNearBottom = paginatedRequests.length > 2 && idx >= paginatedRequests.length - 2;

              return (
                <tr key={req.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={(e) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }
    navigate(isAdminView ? `/admin/requests/${req.id}` : `/requests/${req.id}`);
  }}>
                  {/* Request ID */}
                  <td className="py-3.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                    <Link
                      to={isAdminView ? `/admin/requests/${req.id}` : `/requests/${req.id}`}
                      className="hover:text-[#0089B3] hover:underline flex items-center gap-1 font-medium"
                    >
                      {req.id}
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-400" />
                    </Link>
                  </td>
                  {/* School if Admin */}
                  {isAdminView && (
                    <td 
                      className="py-3.5 px-3 font-normal text-slate-700 truncate" 
                      style={{ maxWidth: colWidths['schoolName'] || '140px' }} 
                      title={req.schoolName}
                    >
                      {req.schoolName}
                    </td>
                  )}
                  {/* Student */}
                  <td 
                    className="py-3.5 px-3 font-normal text-slate-700 truncate" 
                    style={{ maxWidth: colWidths['studentName'] || '120px' }} 
                    title={req.studentName || ''}
                  >
                    {req.studentName || '—'}
                  </td>
                  {/* Beneficiary */}
                  <td 
                    className="py-3.5 px-3 font-normal text-slate-700 truncate" 
                    style={{ maxWidth: colWidths['beneficiaryName'] || '130px' }} 
                    title={req.beneficiaryName}
                  >
                    {req.beneficiaryName}
                  </td>
                  {/* Payment Method */}
                  <td 
                    className="py-3.5 px-3 font-normal text-slate-700 truncate" 
                    style={{ maxWidth: colWidths['payoutMethodName'] || '120px' }} 
                    title={req.payoutDetails?.payoutMethodName || ''}
                  >
                    {req.payoutDetails?.payoutMethodName || '—'}
                  </td>
                  {/* Amount */}
                  <td className="py-3.5 px-3 text-right font-medium text-slate-800 whitespace-nowrap">
                    ${req.amount.toLocaleString()}
                  </td>
                  {/* Status */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <StatusBadge status={req.status} isAdminView={isAdminView} />
                  </td>
                  {/* Last Action */}
                  <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                    <div className="font-normal text-slate-700">
                      {new Date(req.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {new Date(req.updatedAt).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                  </td>
                  {/* Context Sensitive Action Buttons */}
                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1 relative">
                      {/* School User Context Action */}
                      

                      {/* Dropdown Menu Trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : req.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="More Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                            }}
                          />
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute right-0 ${
                              isNearBottom ? 'bottom-full mb-1' : 'top-8'
                            } z-30 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-left divide-y divide-slate-100`}
                          >
                          {/* Non-Admin Specific Actions */}
                          {!isAdminView && (req.status === 'waiting_on_principal' || req.status === 'changes_requested' || req.status === 'response_requested' || req.status === 'waiting_on_beneficiary') && (
                            <div className="py-1">
                              {req.status === 'waiting_on_principal' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      navigate(`/requests/${req.id}/payout`);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-amber-600 hover:bg-amber-50 text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                                    Complete Payout
                                  </button>
                                  {onResendPrincipalReminder && (
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        onResendPrincipalReminder(req);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-amber-800 hover:bg-amber-50 text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                      <Send className="w-3.5 h-3.5 text-amber-600" />
                                      Resend Principal Comms
                                    </button>
                                  )}
                                </>
                              )}
                              {req.status === 'waiting_on_beneficiary' && onResendBeneficiaryConfirmation && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onResendBeneficiaryConfirmation(req);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[#006E8F] hover:bg-[#EDF7FC] text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  <Send className="w-3.5 h-3.5 text-[#0089B3]" />
                                  Resend Beneficiary Comms
                                </button>
                              )}
                              {req.status === 'changes_requested' && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    if (req.taskContext === 'payout_change' && onEditPayout) {
                                      onEditPayout(req);
                                    } else if (onEditRequest) {
                                      onEditRequest(req);
                                    } else {
                                      navigate(`/requests/${req.id}`);
                                    }
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-orange-600 hover:bg-orange-50 text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-orange-500" />
                                  Fix Changes
                                </button>
                              )}
                              {req.status === 'response_requested' && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    navigate(`/requests/${req.id}`);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-amber-600 hover:bg-amber-50 text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                                  Respond
                                </button>
                              )}
                            </div>
                          )}

                          {/* Admin Decisions Section */}
                          {isAdminView && (
                            <div className="py-1">
                              <div className="px-3 py-1 text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                                Quick Actions
                              </div>
                              {req.status === 'waiting_on_beneficiary' && (
                                <>
                                  {onConfirmBeneficiary && (
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        onConfirmBeneficiary(req);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[#006E8F] hover:bg-[#EDF7FC] text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                      <UserCheck className="w-3.5 h-3.5 text-[#0089B3]" />
                                      Confirm Beneficiary
                                    </button>
                                  )}
                                  {onResendBeneficiaryConfirmation && !req.payoutDetails?.beneficiaryConfirmedAt && (
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        onResendBeneficiaryConfirmation(req);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-[#EDF7FC] text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                      <Send className="w-3.5 h-3.5 text-[#0089B3]" />
                                      Resend Beneficiary Comms
                                    </button>
                                  )}
                                </>
                              )}
                              {req.status === 'ready_to_pay' && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onMarkAsPaid && onMarkAsPaid(req);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[#2D5F00] hover:bg-[#F2FCE2] text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5F00]" />
                                  Mark as Paid
                                </button>
                              )}
                              {req.status === 'in_review' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onApproveRequest && onApproveRequest(req);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[#006E8F] hover:bg-[#EDF7FC] text-xs font-semibold transition-colors cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0089B3]" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onRequestChanges && onRequestChanges(req);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-amber-800 hover:bg-amber-50 text-xs font-semibold transition-colors cursor-pointer"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                                    Request Info
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onDenyRequest && onDenyRequest(req);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    Deny
                                  </button>
                                </>
                              )}
                              {req.status === 'waiting_on_principal' && (
                                <>
                                  {onResendPrincipalReminder && (
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        onResendPrincipalReminder(req);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-amber-800 hover:bg-amber-50 text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                      <Send className="w-3.5 h-3.5 text-amber-600" />
                                      Resend Principal Comms
                                    </button>
                                  )}
                                </>
                              )}
                              {(req.status === 'waiting_on_principal' ||
                                req.status === 'changes_requested' ||
                                req.status === 'response_requested') && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    if (onResolvePrincipalTask) {
                                      onResolvePrincipalTask(req);
                                    } else {
                                      navigate(`/admin/requests/${req.id}`);
                                    }
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[#006E8F] hover:bg-[#EDF7FC] text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  <PhoneCall className="w-3.5 h-3.5 text-[#0089B3]" />
                                  Resolve Task (Offline)
                                </button>
                              )}
                            </div>
                          )}
                          <div className="py-1">
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                navigate(isAdminView ? `/admin/requests/${req.id}` : `/requests/${req.id}`);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-400" />
                              View Request
                            </button>
                            {onEditRequest && req.status !== 'paid' && req.status !== 'canceled' && (isAdminView || !['in_review', 'response_requested'].includes(req.status)) && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onEditRequest(req);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                Edit Request
                              </button>
                            )}
                            {onEditPayout && (isAdminView || !['in_review', 'response_requested', 'paid', 'canceled'].includes(req.status)) && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onEditPayout(req);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                                Edit Payout
                              </button>
                            )}
                          </div>
                          {onCancelRequest && req.status !== 'paid' && req.status !== 'canceled' && (
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setRequestToCancel(req);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                Cancel Request
                              </button>
                            </div>
                          )}
                        </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Controls */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span>
            Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{' '}
            <span className="font-bold text-slate-900">
              {Math.min(startIndex + pageSize, sortedRequests.length)}
            </span>{' '}
            of <span className="font-bold text-slate-900">{sortedRequests.length}</span> requests
          </span>
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-300">
            <span className="text-slate-500 font-medium">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 shadow-2xs focus:ring-1 focus:ring-[#0089B3] focus:border-[#0089B3] focus:outline-hidden cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            disabled={safeCurrentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4 text-slate-700" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4 text-slate-700" />
          </button>

          {/* Page Indicator Pills */}
          <div className="flex items-center gap-1 px-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                if (totalPages <= 5) return true;
                return Math.abs(page - safeCurrentPage) <= 1 || page === 1 || page === totalPages;
              })
              .map((page, idx, array) => {
                const showEllipsis = idx > 0 && page - array[idx - 1] > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && <span className="px-1 text-slate-400 font-bold">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        safeCurrentPage === page
                          ? 'bg-[#0F172A] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
          </div>

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4 text-slate-700" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(totalPages)}
            disabled={safeCurrentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Request Cancellation */}
      {requestToCancel && (
        <CancelRequestModal
          request={requestToCancel}
          isOpen={!!requestToCancel}
          onClose={() => setRequestToCancel(null)}
          onConfirmCancel={(reason) => {
            if (onCancelRequest && requestToCancel) {
              onCancelRequest(requestToCancel, reason);
            }
            setRequestToCancel(null);
          }}
          isAdmin={isAdminView}
        />
      )}
    </div>
  );
};

