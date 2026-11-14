import React from 'react';
import {
  Users,
  RefreshCw,
  AlertCircle,
  Search,
  X,
  Check,
  Copy,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { WhatsAppGroupItem } from '../../types/dashboard.types';

interface TabGrupProps {
  groups: WhatsAppGroupItem[];
  groupSearchQuery: string;
  setGroupSearchQuery: (val: string) => void;
  isLoadingGroups: boolean;
  groupsError: string | null;
  togglingGroupId: string | null;
  copiedGroupId: string | null;
  fetchGroups: () => void;
  handleToggleGroup: (groupId: string, currentEnabled: boolean) => void;
  copyGroupIdToClipboard: (groupId: string) => void;
  botStatus: string;
  groupOnly: boolean;
  isTogglingGroupOnly: boolean;
  handleToggleGroupOnly: () => void;
}

export const TabGrup: React.FC<TabGrupProps> = ({
  groups,
  groupSearchQuery,
  setGroupSearchQuery,
  isLoadingGroups,
  groupsError,
  togglingGroupId,
  copiedGroupId,
  fetchGroups,
  handleToggleGroup,
  copyGroupIdToClipboard,
  botStatus,
  groupOnly,
  isTogglingGroupOnly,
  handleToggleGroupOnly,
}) => {
  return (
    <div className="space-y-5">
      {/* Header Tab Grup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Daftar Grup WhatsApp (Whitelist)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  Whitelist System
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola whitelist grup: Aktifkan toggle agar bot merespon di grup tersebut. Jika toggle nonaktif, bot tidak akan merespon command apapun di grup tersebut.
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchGroups}
            disabled={isLoadingGroups}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoadingGroups ? 'animate-spin text-sky-600' : ''}`} />
            <span>{isLoadingGroups ? 'Memuat...' : 'Muat Ulang'}</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border bg-slate-50 text-slate-600 border-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                botStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            ></span>
            <span className="text-[11px] font-mono">
              {botStatus === 'connected' ? 'Bot Terhubung' : 'Bot Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Kartu Pengaturan Mode "Grup Only" & Rekomendasi Keamanan Anti-Banned WhatsApp */}
      <div
        className={`rounded-xl border p-4 transition-colors ${
          groupOnly
            ? 'bg-emerald-50/50 border-emerald-200'
            : 'bg-white border-slate-200 shadow-2xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                groupOnly
                  ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border-amber-200 text-amber-600'
              }`}
            >
              {groupOnly ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <ShieldAlert className="w-4 h-4" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Grup Only
                </h4>
                <span
                  data-testid="group-only-badge"
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    groupOnly
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {groupOnly ? 'ON' : 'OFF'}
                </span>
                {!groupOnly && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Direkomendasikan Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {groupOnly
                  ? 'Status ON: Bot hanya dapat dipicu di dalam grup yang aktif dan akan diam total di chat pribadi (DM), kecuali kelanjutan sesi order (promo/bayar 3 menit) yang dimulai dari grup.'
                  : 'Status OFF: Bot dapat dipicu di dalam grup yang aktif maupun langsung melalui chat pribadi (DM).'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
            <span className="text-xs font-semibold text-slate-700 sm:hidden">
              Mode Grup Only
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono font-bold ${
                  groupOnly ? 'text-emerald-700' : 'text-slate-500'
                }`}
              >
                {groupOnly ? 'ON' : 'OFF'}
              </span>
              <button
                type="button"
                role="switch"
                aria-label="Grup Only"
                aria-checked={groupOnly}
                data-testid="toggle-group-only"
                disabled={isTogglingGroupOnly}
                onClick={handleToggleGroupOnly}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-600/30 ${
                  groupOnly ? 'bg-emerald-500' : 'bg-slate-300'
                } ${isTogglingGroupOnly ? 'opacity-60 cursor-wait' : ''}`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    groupOnly ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Pemberitahuan Rekomendasi Keamanan Akun WhatsApp */}
        <div
          className={`mt-3 rounded-lg border px-3 py-2.5 text-[11.5px] leading-relaxed flex items-start gap-2.5 ${
            groupOnly
              ? 'bg-emerald-100/50 border-emerald-200/80 text-emerald-900'
              : 'bg-amber-50 border-amber-200/90 text-amber-900'
          }`}
        >
          <AlertCircle
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              groupOnly ? 'text-emerald-600' : 'text-amber-600'
            }`}
          />
          <div>
            <span className="font-semibold">
              {groupOnly ? 'Proteksi Aktif: ' : 'Peringatan & Rekomendasi: '}
            </span>
            Disarankan untuk mengaktifkan tombol <strong>Grup Only (ON)</strong>. Saat ini WhatsApp semakin ketat melakukan pemblokiran atau penangguhan terhadap nomor yang terdeteksi beroperasi sebagai bot di chat pribadi (DM). Saat mode ini aktif, bot tidak membalas perintah apa pun di DM, namun alur checkout order yang dimulai dari grup (konfirmasi promo, pembayaran QRIS, dan tombol Hubungi Admin) tetap berjalan normal.
          </div>
        </div>
      </div>

      {/* Warning jika bot belum terhubung */}
      {botStatus !== 'connected' && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-xs text-amber-800">
            <span className="font-semibold block mb-0.5">Bot WhatsApp Belum Terhubung</span>
            Untuk mengambil daftar grup secara langsung, pastikan nomor bot telah terhubung ke WhatsApp menggunakan kode pairing di panel atas.
          </div>
        </div>
      )}

      {/* Toolbar Pencarian & Ringkasan */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
        {/* Input Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={groupSearchQuery}
            onChange={(e) => setGroupSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama grup atau ID grup..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
          />
          {groupSearchQuery && (
            <button
              type="button"
              onClick={() => setGroupSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Stat Badges */}
        <div className="flex items-center gap-2 text-[11px] font-mono flex-wrap">
          <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 font-semibold shadow-2xs">
            Total: <strong className="text-slate-900 font-bold">{groups.length}</strong> Grup
          </span>
          <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
            Aktif: <strong className="font-bold">{groups.filter((g) => g.enabled).length}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600">
            Nonaktif: <strong className="font-bold">{groups.filter((g) => !g.enabled).length}</strong>
          </span>
        </div>
      </div>

      {/* Error Banner jika gagal fetch */}
      {groupsError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-xs text-rose-800">
            <span className="font-semibold block mb-0.5">Gagal Memuat Grup</span>
            {groupsError}
          </div>
          <button
            type="button"
            onClick={fetchGroups}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoadingGroups ? (
        <div className="py-12 text-center space-y-3 bg-white border border-slate-200 rounded-xl">
          <RefreshCw className="w-7 h-7 text-sky-600 animate-spin mx-auto" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-800">
              Mengambil Seluruh Grup WhatsApp...
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Menghubungkan ke soket WhatsApp untuk mendata nama, jumlah anggota, dan ID grup.
            </p>
          </div>
        </div>
      ) : (
        /* Daftar Grup (Responsif: Mobile Card View & Desktop Tabel) */
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          {(() => {
            const q = groupSearchQuery.trim().toLowerCase();
            const filtered = groups.filter(
              (g) =>
                !q ||
                g.subject.toLowerCase().includes(q) ||
                g.id.toLowerCase().includes(q)
            );

            if (filtered.length === 0) {
              return (
                <div className="py-10 text-center text-slate-500 px-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-slate-700 text-xs">
                    {groupSearchQuery
                      ? 'Tidak ada grup yang sesuai dengan pencarian.'
                      : 'Belum ada grup yang diikuti oleh nomor bot.'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {groupSearchQuery
                      ? 'Coba gunakan kata kunci pencarian yang lain.'
                      : 'Gabungkan bot ke grup WhatsApp, lalu klik tombol "Muat Ulang".'}
                  </p>
                </div>
              );
            }

            return (
              <>
                {/* Tampilan Mobile: Card View (block md:hidden) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {filtered.map((grp) => {
                    const isToggling = togglingGroupId === grp.id;
                    const isCopied = copiedGroupId === grp.id;

                    return (
                      <div
                        key={grp.id}
                        className={`p-3.5 space-y-3 transition-colors ${
                          grp.enabled ? 'bg-sky-50/20' : ''
                        }`}
                      >
                        {/* Header Grup Mobile: Avatar, Nama & Toggle */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {grp.subject ? grp.subject.substring(0, 2).toUpperCase() : 'GP'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-xs text-slate-900 leading-snug truncate">
                                {grp.subject || 'Tanpa Nama Grup'}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                <Users className="w-3 h-3 text-slate-400" />
                                <span>{grp.memberCount} Anggota</span>
                              </div>
                            </div>
                          </div>

                          {/* Toggle Switch */}
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={grp.enabled}
                              disabled={isToggling}
                              onClick={() => handleToggleGroup(grp.id, grp.enabled)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                grp.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                              } ${isToggling ? 'opacity-60 cursor-wait' : ''}`}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  grp.enabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span
                              className={`text-[10px] font-mono font-semibold ${
                                grp.enabled ? 'text-emerald-700' : 'text-slate-400'
                              }`}
                            >
                              {grp.enabled ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>
                        </div>

                        {/* ID Grup JID Box */}
                        <div className="bg-slate-50 rounded-lg p-2 flex items-center justify-between gap-2 border border-slate-200/80">
                          <code className="text-[10.5px] font-mono text-slate-700 truncate select-all">
                            {grp.id}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyGroupIdToClipboard(grp.id)}
                            className="px-2 py-1 rounded text-[10px] font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 shrink-0 inline-flex items-center gap-1 cursor-pointer transition shadow-2xs"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-500" />
                                <span>Salin ID</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tampilan Desktop: Tabel (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                        <th className="px-4 py-3 text-center w-28">Toggle Status</th>
                        <th className="px-4 py-3 min-w-[200px]">Nama Grup</th>
                        <th className="px-4 py-3 w-36">Jumlah Anggota</th>
                        <th className="px-4 py-3 min-w-[240px]">ID Grup (JID)</th>
                        <th className="px-4 py-3 w-32 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((grp) => {
                        const isToggling = togglingGroupId === grp.id;
                        const isCopied = copiedGroupId === grp.id;

                        return (
                          <tr
                            key={grp.id}
                            className={`transition-colors hover:bg-slate-50/70 ${
                              grp.enabled ? 'bg-sky-50/20' : ''
                            }`}
                          >
                            {/* Kolom 1: Toggle Switch */}
                            <td className="px-4 py-3 text-center align-middle">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={grp.enabled}
                                  disabled={isToggling}
                                  onClick={() => handleToggleGroup(grp.id, grp.enabled)}
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-600/30 ${
                                    grp.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                                  } ${isToggling ? 'opacity-60 cursor-wait' : ''}`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                      grp.enabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                                <span
                                  className={`text-[10px] font-mono font-semibold ${
                                    grp.enabled ? 'text-emerald-700' : 'text-slate-400'
                                  }`}
                                >
                                  {grp.enabled ? 'Aktif' : 'Nonaktif'}
                                </span>
                              </div>
                            </td>

                            {/* Kolom 2: Nama Grup */}
                            <td className="px-4 py-3 align-middle">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                  {grp.subject ? grp.subject.substring(0, 2).toUpperCase() : 'GP'}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-semibold text-slate-900 block truncate text-xs">
                                    {grp.subject || 'Tanpa Nama Grup'}
                                  </span>
                                  {grp.desc ? (
                                    <span className="text-[11px] text-slate-500 truncate block max-w-xs mt-0.5">
                                      {grp.desc}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 italic block mt-0.5">
                                      Grup WhatsApp Aktif
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Kolom 3: Jumlah Anggota */}
                            <td className="px-4 py-3 align-middle">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono font-semibold text-xs bg-slate-100 text-slate-700 border border-slate-200">
                                <Users className="w-3.5 h-3.5 text-slate-500" />
                                <span>{grp.memberCount} Anggota</span>
                              </span>
                            </td>

                            {/* Kolom 4: ID Grup (JID) */}
                            <td className="px-4 py-3 align-middle">
                              <div className="flex items-center gap-1.5">
                                <code className="text-[11px] font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 select-all truncate max-w-xs block">
                                  {grp.id}
                                </code>
                                <button
                                  type="button"
                                  title="Salin ID Grup"
                                  onClick={() => copyGroupIdToClipboard(grp.id)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                >
                                  {isCopied ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Kolom 5: Aksi / Salin */}
                            <td className="px-4 py-3 text-right align-middle">
                              <button
                                type="button"
                                onClick={() => copyGroupIdToClipboard(grp.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-700">Tersalin</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-slate-500" />
                                    <span>Salin ID</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
