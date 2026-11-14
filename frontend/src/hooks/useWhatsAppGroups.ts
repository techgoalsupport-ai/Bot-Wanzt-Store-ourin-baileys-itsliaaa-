import { useState, useEffect } from 'react';
import { WhatsAppGroupItem } from '../types/dashboard.types';

export function useWhatsAppGroups(
  selectedTab: string,
  botStatus: string,
  showToast: (msg: string) => void
) {
  const [groups, setGroups] = useState<WhatsAppGroupItem[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>('');
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [togglingGroupId, setTogglingGroupId] = useState<string | null>(null);
  const [groupOnly, setGroupOnly] = useState<boolean>(false);
  const [isTogglingGroupOnly, setIsTogglingGroupOnly] = useState<boolean>(false);

  const fetchGroupOnlyStatus = async () => {
    try {
      const res = await fetch('/api/bot/groups/group-only');
      const data = await res.json();
      if (typeof data.groupOnly === 'boolean') {
        setGroupOnly(data.groupOnly);
      }
    } catch {}
  };

  const fetchGroups = async () => {
    setIsLoadingGroups(true);
    setGroupsError(null);
    try {
      const res = await fetch('/api/bot/groups');
      const data = await res.json();
      if (typeof data.groupOnly === 'boolean') {
        setGroupOnly(data.groupOnly);
      }
      if (data.connected === false) {
        setGroupsError(data.message || 'Bot belum terhubung ke WhatsApp.');
        setGroups([]);
      } else if (data.groups) {
        setGroups(data.groups);
      }
    } catch (err: any) {
      setGroupsError(err?.message || 'Gagal memuat grup WhatsApp.');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const handleToggleGroup = async (groupId: string, currentEnabled: boolean) => {
    const nextVal = !currentEnabled;
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, enabled: nextVal } : g))
    );
    setTogglingGroupId(groupId);
    try {
      const res = await fetch('/api/bot/groups/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, enabled: nextVal }),
      });
      if (!res.ok) {
        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, enabled: currentEnabled } : g))
        );
        showToast('Gagal memperbarui status toggle grup.');
      } else {
        showToast(`Grup ${nextVal ? 'diaktifkan' : 'dinonaktifkan'}.`);
      }
    } catch {
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, enabled: currentEnabled } : g))
      );
      showToast('Koneksi gagal saat mengubah status grup.');
    } finally {
      setTogglingGroupId(null);
    }
  };

  const handleToggleGroupOnly = async () => {
    const prevVal = groupOnly;
    const nextVal = !prevVal;
    setGroupOnly(nextVal);
    setIsTogglingGroupOnly(true);
    try {
      const res = await fetch('/api/bot/groups/group-only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextVal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        setGroupOnly(prevVal);
        showToast(data.error || 'Gagal memperbarui mode Grup Only.');
      } else {
        const finalVal = typeof data.groupOnly === 'boolean' ? data.groupOnly : nextVal;
        setGroupOnly(finalVal);
        showToast(
          finalVal
            ? 'Mode Grup Only DIAKTIFKAN. Bot akan diam di chat pribadi (kecuali sesi order).'
            : 'Mode Grup Only DINONAKTIFKAN. Bot dapat dipicu di grup maupun chat pribadi.'
        );
      }
    } catch {
      setGroupOnly(prevVal);
      showToast('Koneksi gagal saat mengubah mode Grup Only.');
    } finally {
      setIsTogglingGroupOnly(false);
    }
  };

  const copyGroupIdToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedGroupId(id);
    showToast('ID Grup berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedGroupId(null), 2000);
  };

  useEffect(() => {
    fetchGroupOnlyStatus();
  }, []);

  useEffect(() => {
    if (
      selectedTab === 'Management group' ||
      selectedTab === 'Grup' ||
      selectedTab === 'tab04'
    ) {
      fetchGroups();
    }
  }, [selectedTab, botStatus]);

  return {
    groups,
    setGroups,
    isLoadingGroups,
    groupsError,
    groupSearchQuery,
    setGroupSearchQuery,
    copiedGroupId,
    togglingGroupId,
    groupOnly,
    isTogglingGroupOnly,
    fetchGroups,
    handleToggleGroup,
    handleToggleGroupOnly,
    copyGroupIdToClipboard,
  };
}
