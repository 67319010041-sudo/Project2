import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; // Import Auth
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'
import { Check, X, Clock, Loader2, Save } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '@/lib/api-config';

interface SubjectAttendanceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    subject: any;
    students: any[]; // Already filtered by subject
}

export default function SubjectAttendanceDialog({ isOpen, onClose, subject, students }: SubjectAttendanceDialogProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [attendanceData, setAttendanceData] = useState<Record<string, { status: string; remarks?: string }>>({});
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default Today

    // Initialize data when dialog opens
    useEffect(() => {
        if (isOpen) {
            const initialData: any = {};
            students.forEach(s => {
                initialData[s._id] = { status: 'present', remarks: '' };
            });
            setAttendanceData(initialData);
        }
    }, [isOpen, students]);

    const handleStatusChange = (studentId: string, status: string) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], status }
        }));
    };

    const handleRemarksChange = (studentId: string, remarks: string) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], remarks }
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Group by Class required? 
            // The API expects `classId`.
            // Problem: Students in a "Subject" might be from DIFFERENT classes.
            // We need to group payload by class.

            const studentsByClass: Record<string, any[]> = {};

            students.forEach(s => {
                if (!s.studentClass) return; // Skip if no class
                if (!studentsByClass[s.studentClass]) studentsByClass[s.studentClass] = [];
                studentsByClass[s.studentClass].push(s);
            });

            // We need to map Class Name -> Class ID.
            // This component doesn't have Class IDs. 
            // We should probably fetch classes list or pass it in.
            // For now, let's assume we can fetch it or ignore (this is a blocker if backend enforces valid classId).
            // Backend `upsertAttendance` REQUIRES `classId`.

            // Allow parent to handle save or fetch classes here?
            // Let's fetch classes here to map.
            const classesRes = await fetch(API_ENDPOINTS.CLASSES.LIST);
            const classesList = await classesRes.json();

            const promises = Object.keys(studentsByClass).map(async (className) => {
                const classObj = classesList.find((c: any) => c.name === className);
                if (!classObj || !user) return;

                const records = studentsByClass[className].map(s => ({
                    studentId: s._id,
                    status: attendanceData[s._id]?.status || 'present',
                    remarks: attendanceData[s._id]?.remarks || ''
                }));

                const token = await user.getIdToken();
                return fetch(API_ENDPOINTS.ATTENDANCE.CREATE, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        classId: classObj._id,
                        date: new Date(date).toISOString(), // Use selected date
                        records
                    })
                });
            });

            await Promise.all(promises);
            toast.success('Attendance saved successfully');
            onClose();

        } catch (error) {
            console.error(error);
            toast.error('Failed to save attendance');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b">
                    <DialogTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-600" />
                            Attendance for {subject?.name}
                        </span>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-[150px]"
                        />
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-4">
                        {students.map(student => (
                            <div key={student._id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50 hover:bg-white transition-colors">
                                <div className="flex items-center gap-3 w-1/3">
                                    <Avatar className="h-10 w-10 border">
                                        <AvatarImage src={student.photoURL} />
                                        <AvatarFallback>{student.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium text-sm text-slate-900">{student.displayName}</p>
                                        <p className="text-xs text-slate-500">{student.studentClass || 'No Class'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleStatusChange(student._id, 'present')}
                                        className={`p-2 rounded-md transition-all ${attendanceData[student._id]?.status === 'present' ? 'bg-green-100 text-green-700 ring-2 ring-green-200' : 'text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        <Check className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(student._id, 'absent')}
                                        className={`p-2 rounded-md transition-all ${attendanceData[student._id]?.status === 'absent' ? 'bg-red-100 text-red-700 ring-2 ring-red-200' : 'text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(student._id, 'late')}
                                        className={`p-2 rounded-md transition-all ${attendanceData[student._id]?.status === 'late' ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-200' : 'text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        <Clock className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="w-1/3">
                                    {attendanceData[student._id]?.status === 'late' && (
                                        <Input
                                            placeholder="Reason for late..."
                                            value={attendanceData[student._id]?.remarks || ''}
                                            onChange={(e) => handleRemarksChange(student._id, e.target.value)}
                                            className="h-9 text-xs"
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className="p-6 border-t bg-slate-50">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Attendance
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
