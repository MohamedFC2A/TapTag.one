import React from "react";
import Link from "next/link";
import { AlertOctagon, ArrowLeft, ShieldAlert } from "lucide-react";

export default function TagNotFound() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#E4E4E7] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <div className="w-16 h-16 rounded-full border border-red-800 bg-red-950/40 flex items-center justify-center text-red-500 mb-6">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h1 className="text-xl font-bold text-white mb-2">
        رمز البطاقة غير مسجل أو غير مفعل
      </h1>
      <p className="text-xs text-zinc-400 max-w-md mb-8 leading-relaxed">
        لم يتم العثور على سجل معتمد لهذه البطاقة في سجلات TapTag.one. تأكد من صحة مسح رمز الـ QR أو أن البطاقة تم تفعيلها بواسطة المالك.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded border border-zinc-800 bg-zinc-900 text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>العودة للبوابة الرئيسية</span>
        </Link>
      </div>
    </div>
  );
}
