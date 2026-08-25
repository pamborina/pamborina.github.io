import React, { useState, useEffect } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { Activity, Clock, ShieldCheck, Trash2 } from 'lucide-react';
import { storageService, ActivityLogEntry } from '../../services/storageService';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLogs(storageService.getActivityLog());
    }
  }, [isOpen]);

  const handleClear = () => {
    storageService.setItem('pamborina_customer_activity_log', []);
    setLogs([]);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="سجل نشاط تحركات العميل (Timeline)"
      subtitle="تسجيل زمني دقيق لكل الأفعال والتحركات داخل التطبيق"
    >
      <div className="space-y-4 text-right dir-rtl">
        {logs.length > 0 && (
          <div className="flex items-center justify-between pb-2 border-b border-[#2D2017]">
            <span className="text-xs font-bold text-[#F4E08B] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>إجمالي الأحداث المسجلة: {logs.length}</span>
            </span>
            <button
              onClick={handleClear}
              className="text-xs text-[#8E8373] hover:text-rose-400 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح السجل</span>
            </button>
          </div>
        )}

        {logs.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <Activity className="w-8 h-8 text-[#8E8373] mx-auto opacity-50" />
            <p className="text-xs text-[#8E8373]">لا يوجد نشاط مسجل حتى الآن.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-[#170E08] border border-[#2D2017] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37] shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-[#FFF1C5]">{log.actionAr}</h5>
                    {log.detailsAr && (
                      <p className="text-[11px] text-[#C8BFB0] truncate">{log.detailsAr}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#8E8373] shrink-0">
                  <Clock className="w-3 h-3 text-[#D4AF37]" />
                  <span>{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
