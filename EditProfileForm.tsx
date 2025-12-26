'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Label } from '@/components/ui/label';
import { User, GraduationCap, School, BookOpen } from 'lucide-react';

const EDUCATION_LEVEL_MAP: Record<string, string> = {
    'k1': 'อนุบาล 1', 'k2': 'อนุบาล 2', 'k3': 'อนุบาล 3',
    'p1': 'ประถมศึกษาปีที่ 1', 'p2': 'ประถมศึกษาปีที่ 2', 'p3': 'ประถมศึกษาปีที่ 3',
    'p4': 'ประถมศึกษาปีที่ 4', 'p5': 'ประถมศึกษาปีที่ 5', 'p6': 'ประถมศึกษาปีที่ 6',
    'm1': 'มัธยมศึกษาปีที่ 1', 'm2': 'มัธยมศึกษาปีที่ 2', 'm3': 'มัธยมศึกษาปีที่ 3',
    'm4': 'มัธยมศึกษาปีที่ 4', 'm5': 'มัธยมศึกษาปีที่ 5', 'm6': 'มัธยมศึกษาปีที่ 6',
    'vc1': 'ปวช.1', 'vc2': 'ปวช.2', 'vc3': 'ปวช.3',
    'bachelor': 'ปริญญาตรี', 'master': 'ปริญญาโท', 'doctorate': 'ปริญญาเอก',
    'general': 'บุคคลทั่วไป', 'other': 'อื่นๆ'
};

export default function EditProfileForm() {
    const { user } = useAuth();

    // Convert studyTimes (if it exists) to list or display registered subjects
    const subjects = user?.enrolledSubjects || [];

    return (
        <div className="space-y-8 pt-6 border-t border-slate-100 dark:border-slate-800">

            {/* Personal Information Section */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-500" />
                    ข้อมูลส่วนตัว
                </h3>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Parent Name */}
                    <div className="space-y-2">
                        <Label className="text-slate-500 font-medium">ชื่อผู้ปกครอง</Label>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                <User className="w-5 h-5 text-blue-500" />
                            </div>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {user?.parentName || '-'}
                            </span>
                        </div>
                    </div>

                    {/* Student Name */}
                    <div className="space-y-2">
                        <Label className="text-slate-500 font-medium">ชื่อนักเรียน</Label>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                <User className="w-5 h-5 text-orange-500" />
                            </div>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {user?.studentName || user?.displayName || '-'}
                            </span>
                        </div>
                    </div>

                    {/* School */}
                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-slate-500 font-medium">โรงเรียน</Label>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                <School className="w-5 h-5 text-pink-500" />
                            </div>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {user?.school || '-'}
                            </span>
                        </div>
                    </div>

                    {/* Education Level */}
                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-slate-500 font-medium">ระดับการศึกษา</Label>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                <GraduationCap className="w-5 h-5 text-purple-500" />
                            </div>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {user?.educationLevel ? (EDUCATION_LEVEL_MAP[user.educationLevel] || user.educationLevel) : '-'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Registered Subjects List (Read Only) */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                    รายวิชาที่ลงทะเบียน
                </h3>
                {subjects.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {subjects.map((subject, index) => (
                            <div key={index} className="flex flex-col p-5 rounded-2xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm opacity-75">
                                <div className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-slate-300 rounded-full"></div>
                                    {subject}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-400">ไม่มีรายวิชา</p>
                )}
            </div>
        </div>
    );
}
