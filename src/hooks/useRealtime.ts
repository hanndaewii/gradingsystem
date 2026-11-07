'use client';

import * as React from 'react';
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export interface RealtimeGradeChange {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'grades';
  record: {
    id: string;
    section_id: string;
    student_id: string;
    assessment_id: string;
    value: number | null;
    status: string;
    comment: string | null;
    graded_by: string;
    graded_at: string;
  };
  old_record?: {
    id: string;
    value: number | null;
    status: string;
  };
}

export interface RealtimeEnrollmentChange {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'enrollments';
  record: {
    id: string;
    section_id: string;
    student_id: string;
    status: string;
  };
  old_record?: {
    status: string;
  };
}

export interface RealtimeAssessmentChange {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'assessments';
  record: {
    id: string;
    section_id: string;
    title: string;
    type: string;
    order: number;
  };
}

type RealtimeCallback<T> = (payload: T) => void;

export function useRealtimeGrades(sectionId: string, onGradeChange?: RealtimeCallback<RealtimeGradeChange>) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!sectionId) return;

    const channel = supabase
      .channel(`grades:${sectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grades',
          filter: `section_id=eq.${sectionId}`,
        },
        (payload) => {
          const change = payload as RealtimeGradeChange;
          
          // Call custom callback
          onGradeChange?.(change);

          // Invalidate queries to refresh UI
          queryClient.invalidateQueries({ queryKey: ['professor', 'grades', sectionId] });
          
          // Also invalidate section stats
          queryClient.invalidateQueries({ queryKey: ['professor', 'class', sectionId] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sectionId, onGradeChange, queryClient]);

  return { channel: channelRef.current };
}

export function useRealtimeEnrollments(sectionId: string, onEnrollmentChange?: RealtimeCallback<RealtimeEnrollmentChange>) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!sectionId) return;

    const channel = supabase
      .channel(`enrollments:${sectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrollments',
          filter: `section_id=eq.${sectionId}`,
        },
        (payload) => {
          const change = payload as RealtimeEnrollmentChange;
          
          onEnrollmentChange?.(change);
          queryClient.invalidateQueries({ queryKey: ['professor', 'enrollments', sectionId] });
          queryClient.invalidateQueries({ queryKey: ['professor', 'class', sectionId] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sectionId, onEnrollmentChange, queryClient]);

  return { channel: channelRef.current };
}

export function useRealtimeAssessments(sectionId: string, onAssessmentChange?: RealtimeCallback<RealtimeAssessmentChange>) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!sectionId) return;

    const channel = supabase
      .channel(`assessments:${sectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assessments',
          filter: `section_id=eq.${sectionId}`,
        },
        (payload) => {
          const change = payload as RealtimeAssessmentChange;
          
          onAssessmentChange?.(change);
          queryClient.invalidateQueries({ queryKey: ['professor', 'assessments', sectionId] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sectionId, onAssessmentChange, queryClient]);

  return { channel: channelRef.current };
}

// Combined hook for all realtime updates in a section
export function useSectionRealtime(sectionId: string) {
  const gradeChangeRef = useRef<RealtimeGradeChange | null>(null);
  const enrollmentChangeRef = useRef<RealtimeEnrollmentChange | null>(null);
  const assessmentChangeRef = useRef<RealtimeAssessmentChange | null>(null);

  const handleGradeChange = useCallback((change: RealtimeGradeChange) => {
    gradeChangeRef.current = change;
    // Dispatch custom event for components to listen
    window.dispatchEvent(new CustomEvent('grade-change', { detail: change }));
  }, []);

  const handleEnrollmentChange = useCallback((change: RealtimeEnrollmentChange) => {
    enrollmentChangeRef.current = change;
    window.dispatchEvent(new CustomEvent('enrollment-change', { detail: change }));
  }, []);

  const handleAssessmentChange = useCallback((change: RealtimeAssessmentChange) => {
    assessmentChangeRef.current = change;
    window.dispatchEvent(new CustomEvent('assessment-change', { detail: change }));
  }, []);

  useRealtimeGrades(sectionId, handleGradeChange);
  useRealtimeEnrollments(sectionId, handleEnrollmentChange);
  useRealtimeAssessments(sectionId, handleAssessmentChange);

  // Hook for components to subscribe to changes
  const useGradeChanges = useCallback((callback: (change: RealtimeGradeChange) => void) => {
    useEffect(() => {
      const handler = (event: CustomEvent) => callback(event.detail);
      window.addEventListener('grade-change', handler as EventListener);
      return () => window.removeEventListener('grade-change', handler as EventListener);
    }, [callback]);
  }, []);

  const useEnrollmentChanges = useCallback((callback: (change: RealtimeEnrollmentChange) => void) => {
    useEffect(() => {
      const handler = (event: CustomEvent) => callback(event.detail);
      window.addEventListener('enrollment-change', handler as EventListener);
      return () => window.removeEventListener('enrollment-change', handler as EventListener);
    }, [callback]);
  }, []);

  const useAssessmentChanges = useCallback((callback: (change: RealtimeAssessmentChange) => void) => {
    useEffect(() => {
      const handler = (event: CustomEvent) => callback(event.detail);
      window.addEventListener('assessment-change', handler as EventListener);
      return () => window.removeEventListener('assessment-change', handler as EventListener);
    }, [callback]);
  }, []);

  return {
    useGradeChanges,
    useEnrollmentChanges,
    useAssessmentChanges,
    lastGradeChange: gradeChangeRef.current,
    lastEnrollmentChange: enrollmentChangeRef.current,
    lastAssessmentChange: assessmentChangeRef.current,
  };
}

// Hook for broadcasting local changes to other tabs
export function useBroadcastChannel(channelName: string) {
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      channelRef.current = new BroadcastChannel(channelName);
    }
    return () => {
      channelRef.current?.close();
    };
  }, [channelName]);

  const postMessage = useCallback((message: unknown) => {
    channelRef.current?.postMessage(message);
  }, []);

  const onMessage = useCallback((callback: (message: unknown) => void) => {
    if (!channelRef.current) return () => {};
    
    const handler = (event: MessageEvent) => callback(event.data);
    channelRef.current.addEventListener('message', handler);
    return () => channelRef.current?.removeEventListener('message', handler);
  }, []);

  return { postMessage, onMessage };
}

// Specific broadcast channel for gradebook sync
export function useGradebookSync(sectionId: string) {
  const { postMessage, onMessage } = useBroadcastChannel(`gradebook:${sectionId}`);

  const broadcastGradeChange = useCallback((studentId: string, assessmentId: string, value: number | null) => {
    postMessage({ type: 'GRADE_CHANGE', studentId, assessmentId, value, timestamp: Date.now() });
  }, [postMessage]);

  const broadcastBulkChange = useCallback((changes: Array<{ studentId: string; assessmentId: string; value: number | null }>) => {
    postMessage({ type: 'BULK_CHANGE', changes, timestamp: Date.now() });
  }, [postMessage]);

  const subscribeToChanges = useCallback((callback: (message: { type: string; [key: string]: unknown }) => void) => {
    return onMessage(callback);
  }, [onMessage]);

  return { broadcastGradeChange, broadcastBulkChange, subscribeToChanges };
}