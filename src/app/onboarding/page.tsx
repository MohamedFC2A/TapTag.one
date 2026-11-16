"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  User,
  Briefcase,
  ShieldCheck,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { SegmentedLedBar } from "@/components/ui/SegmentedLedBar";
import { validateInternalRedirectUrl } from "@/lib/auth-redirect-edge";
import { Language } from "@/types";

interface OnboardingDraft {
  fullName: string;
  role: string;
  workspaceName: string;
  useCase: string;
  step: number;
}

const STORAGE_PREFIX = "mata_onboarding_draft:";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const sig = searchParams.get("sig") || "";
  const rawNext = searchParams.get("next") || "/dashboard";
  const safeNext = validateInternalRedirectUrl(rawNext, "/dashboard");
  const initialStepParam = Number(searchParams.get("step") || "1");

  const [lang, setLang] = useState<Language>("ar");
  const isAr = lang === "ar";

  const [step, setStep] = useState<number>(
    Number.isFinite(initialStepParam) ? Math.min(3, Math.max(1, initialStepParam)) : 1
  );
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [useCase, setUseCase] = useState("Smart QR & Vault");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(Boolean(uid));
  const [saving, setSaving] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftKey = `${STORAGE_PREFIX}${uid || "default"}`;

  // Hydrate draft from localStorage + PostgreSQL user profile
  useEffect(() => {
    let active = true;
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft) as Partial<OnboardingDraft>;
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.role) setRole(parsed.role);
        if (parsed.workspaceName) setWorkspaceName(parsed.workspaceName);
        if (parsed.useCase) setUseCase(parsed.useCase);
        if (parsed.step && !searchParams.get("step")) {
          setStep(Math.min(3, Math.max(1, parsed.step)));
        }
      }
    } catch {
      // Ignore storage error
    }

    if (!uid) {
      setLoading(false);
      return;
    }

    fetch(`/api/auth/onboarding?uid=${encodeURIComponent(uid)}&sig=${encodeURIComponent(sig)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data?.user) return;
        const u = data.user;
        setUserEmail(u.email || "");
        if (u.fullName) setFullName((prev) => prev || u.fullName);
        if (u.role) setRole((prev) => prev || u.role);
        if (u.workspaceName) setWorkspaceName((prev) => prev || u.workspaceName);
        if (u.useCase) setUseCase((prev) => prev || u.useCase);
        if (typeof u.onboardingStep === "number" && !searchParams.get("step")) {
          setStep(Math.min(3, Math.max(1, u.onboardingStep)));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [uid, sig, draftKey, searchParams]);

  // Persist instant local draft + debounced PostgreSQL auto-sync on every edit
  useEffect(() => {
    try {
      const draft: OnboardingDraft = { fullName, role, workspaceName, useCase, step };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // Ignore quota errors
    }

    if (!uid) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSyncState("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch("/api/auth/onboarding", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid,
            step,
            fullName: fullName.trim() || null,
            role: role.trim() || null,
            workspaceName: workspaceName.trim() || null,
            useCase: useCase.trim() || null,
            next: safeNext,
          }),
        });
        setSyncState("saved");
      } catch {
        setSyncState("idle");
      }
    }, 450);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [fullName, role, workspaceName, useCase, step, uid, draftKey, safeNext]);

  const goToStep = async (nextStep: number) => {
    setError(null);
    if (nextStep === 2 && !fullName.trim()) {
      setError(isAr ? "يرجى إدخال الاسم الكامل للمتابعة." : "Please enter your full name.");
      return;
    }
    if (nextStep === 3 && !workspaceName.trim()) {
      setError(isAr ? "يرجى إدخال اسم مساحة العمل." : "Please enter a workspace name.");
      return;
    }
    setStep(nextStep);
    if (uid) {
      await fetch("/api/auth/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          step: nextStep,
          fullName: fullName.trim() || null,
          role: role.trim() || null,
          workspaceName: workspaceName.trim() || null,
          useCase: useCase.trim() || null,
          next: safeNext,
        }),
      }).catch(() => {});
    }
  };

  const handleCompleteOnboarding = async () => {
    setError(null);
    setSaving(true);
    try {
      if (uid) {
        const res = await fetch("/api/auth/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid,
            step: 3,
            fullName: fullName.trim() || "Mata User",
            role: role.trim() || "Member",
            workspaceName: workspaceName.trim() || "Primary Workspace",
            useCase: useCase.trim() || "Smart QR & Vault",
            complete: true,
            next: safeNext,
          }),
        });
        if (!res.ok) {
          throw new Error(isAr ? "تعذر حفظ بيانات الإكمال." : "Could not complete onboarding.");
        }
      }
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
      router.push(safeNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save onboarding");
      setSaving(false);
    }
  };

  const stepsMeta = [
    { num: 1, icon: User, labelAr: "البيانات الشخصية", labelEn: "Profile Identity" },
    { num: 2, icon: Briefcase, labelAr: "مساحة العمل", labelEn: "Workspace Setup" },
    { num: 3, icon: ShieldCheck, labelAr: "التأكيد والوجهة", labelEn: "Confirm & Redirect" },
  ];

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-[#09090B] text-[#FFFFFF] flex flex-col">
      <Header lang={lang} onLanguageChange={setLang} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="space-y-2 text-start">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {isAr ? "إكمال بيانات الحساب" : "Complete Account Onboarding"}
            </h1>
            <span className="text-[11px] font-mono text-[#71717A]" dir="ltr">
              {syncState === "saving"
                ? isAr
                  ? "جارٍ الحفظ..."
                  : "Saving..."
                : syncState === "saved"
                ? isAr
                  ? "محفوظ تلقائياً"
                  : "Auto-Saved"
                : `STEP ${step}/3`}
            </span>
          </div>
          {userEmail && (
            <p className="text-xs font-mono text-[#A1A1AA]" dir="ltr">
              {userEmail} · next → <span className="text-[#FFFFFF]">{safeNext}</span>
            </p>
          )}
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2">
          {stepsMeta.map((s) => {
            const Icon = s.icon;
            const active = step === s.num;
            const done = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => (s.num <= step ? setStep(s.num) : goToStep(s.num))}
                className={`p-3 rounded-xl border text-start transition-all cursor-pointer ${
                  active
                    ? "border-[#FFFFFF] bg-[#18181B]"
                    : done
                    ? "border-[#3F3F46] bg-[#121215]"
                    : "border-[#27272A] bg-[#121215] opacity-60"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Icon className="w-4 h-4 text-[#FFFFFF]" />
                  {done && <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />}
                </div>
                <span className="text-[11px] font-bold block">
                  {isAr ? s.labelAr : s.labelEn}
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-[#27272A] bg-[#121215] overflow-hidden">
          <SegmentedLedBar
            level={step === 1 ? 35 : step === 2 ? 70 : 100}
            status={saving ? "working" : step === 3 ? "success" : "active"}
            label={`ONBOARDING · STEP ${step}/3`}
            metricText={safeNext}
          />

          {loading ? (
            <div className="p-12 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#FFFFFF]" />
              <p className="text-xs font-mono text-[#71717A]">
                {isAr ? "جاري استرجاع تقدمك المحفوظ..." : "Restoring saved progress..."}
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-5 text-start">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#A1A1AA] block">
                      {isAr ? "الاسم الكامل" : "Full Name"}
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={isAr ? "مثال: محمد مطعني" : "e.g. Mohamed Matany"}
                      className="w-full h-11 px-3.5 rounded-lg bg-[#09090B] border border-[#27272A] text-sm text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#A1A1AA] block">
                      {isAr ? "المسمى الوظيفي / الدور" : "Role / Title"}
                    </label>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder={isAr ? "مثال: مهندس برمجيات / مدير منتج" : "e.g. Software Architect"}
                      className="w-full h-11 px-3.5 rounded-lg bg-[#09090B] border border-[#27272A] text-sm text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#A1A1AA] block">
                      {isAr ? "اسم مساحة العمل / المؤسسة" : "Workspace / Organization Name"}
                    </label>
                    <input
                      type="text"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      placeholder={isAr ? "مثال: Matany Group Studio" : "e.g. Matany Group Studio"}
                      className="w-full h-11 px-3.5 rounded-lg bg-[#09090B] border border-[#27272A] text-sm text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#A1A1AA] block">
                      {isAr ? "الاستخدام الأساسي للمنصة" : "Primary Use Case"}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        "Smart QR & Vault",
                        "Encrypted File Sharing",
                        "All-Format Conversion",
                        "Contact Link Intelligence",
                      ].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setUseCase(opt)}
                          className={`h-10 px-3 rounded-lg border text-xs font-mono text-start transition-colors cursor-pointer ${
                            useCase === opt
                              ? "bg-[#FFFFFF] text-[#09090B] border-[#FFFFFF] font-bold"
                              : "bg-[#09090B] text-[#A1A1AA] border-[#27272A] hover:text-[#FFFFFF]"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-[#27272A] bg-[#09090B] space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between gap-2">
                      <span className="text-[#71717A]">{isAr ? "الاسم:" : "Name:"}</span>
                      <span className="text-[#FFFFFF] font-bold">{fullName || "—"}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#71717A]">{isAr ? "الدور:" : "Role:"}</span>
                      <span className="text-[#FFFFFF]">{role || "Member"}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#71717A]">{isAr ? "مساحة العمل:" : "Workspace:"}</span>
                      <span className="text-[#FFFFFF]">{workspaceName || "—"}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#71717A]">{isAr ? "المجال:" : "Use Case:"}</span>
                      <span className="text-[#FFFFFF]">{useCase}</span>
                    </div>
                    <div className="flex justify-between gap-2 pt-2 border-t border-[#27272A]">
                      <span className="text-[#71717A]">{isAr ? "الوجهة التالية:" : "Redirect Target:"}</span>
                      <span className="text-[#10B981]" dir="ltr">
                        {safeNext}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg border border-[#FFFFFF] bg-[#09090B] text-xs font-mono text-[#FFFFFF]">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.max(1, s - 1))}
                    className="h-11 px-4 rounded-xl border border-[#27272A] bg-[#09090B] text-[#FFFFFF] hover:border-[#FFFFFF] font-mono text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                    <span>{isAr ? "السابق" : "Back"}</span>
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="h-11 px-4 rounded-xl border border-[#27272A] bg-[#09090B] text-[#A1A1AA] hover:text-[#FFFFFF] font-mono text-xs inline-flex items-center"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </Link>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => goToStep(step + 1)}
                    className="h-11 px-6 rounded-xl bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>{isAr ? "حفظ والمتابعة" : "Save & Continue"}</span>
                    {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCompleteOnboarding}
                    disabled={saving}
                    className="h-11 px-6 rounded-xl bg-[#FFFFFF] text-[#09090B] border border-[#FFFFFF] hover:bg-[#09090B] hover:text-[#FFFFFF] font-mono font-bold text-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>{isAr ? `إكمال والانتقال إلى ${safeNext}` : `Finish & Go to ${safeNext}`}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer lang={lang} />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090B]" />}>
      <OnboardingContent />
    </Suspense>
  );
}
