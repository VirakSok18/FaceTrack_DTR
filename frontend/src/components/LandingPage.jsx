import React from 'react';
import { Download, ShieldCheck, Cpu, Building2, CheckCircle2, Clock, Smartphone, Lock, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage({ auth }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-950 selection:text-white">
      {/* Hero Section */}
      <section className="pt-36 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center relative overflow-hidden">
        {/* Glow / Subtle Ambient Element */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-slate-100 rounded-full blur-3xl -z-10 pointer-events-none opacity-60" />

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-950 tracking-tight leading-[1.08] max-w-4xl mx-auto mb-6">
          Smart Facial Attendance for Modern Workplaces.
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
          Touchless on-device biometric check-in with real-time HR tracking. Zero servers to manage, 100% serverless powered by Supabase.
        </p>

        {/* Call to Action (Download Button) */}
        <div className="flex items-center justify-center max-w-md mx-auto mb-16">
          <a
            href="/facetrack.apk"
            download="facetrack.apk"
            className="flex items-center justify-center gap-3 bg-slate-950 hover:bg-slate-800 text-white px-8 py-4 rounded-full font-bold text-sm shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-0.5 group"
          >
            <Download className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>Download Android APK</span>
          </a>
        </div>

        {/* Interactive Kiosk Mockup Card (White & Black Rounded-3xl) */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-50 p-3 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xl shadow-slate-200/50">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 flex flex-col md:flex-row items-center gap-8 text-left">
              {/* Camera Preview Simulation */}
              <div className="relative w-full md:w-80 h-80 bg-slate-950 rounded-2xl overflow-hidden flex flex-col items-center justify-between p-6 shadow-inner shrink-0">
                {/* Top Corner Frame Markers */}
                <div className="w-full flex justify-between">
                  <div className="w-6 h-6 border-t-2 border-l-2 border-white/80 rounded-tl-lg" />
                  <div className="w-6 h-6 border-t-2 border-r-2 border-white/80 rounded-tr-lg" />
                </div>

                {/* Center Biometric Face Reticle */}
                <div className="relative flex flex-col items-center">
                  <div className="w-32 h-32 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center animate-pulse">
                    <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                      <ShieldCheck className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <span className="mt-4 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full">
                    Face Verified (42ms)
                  </span>
                </div>

                {/* Bottom Corner Frame Markers */}
                <div className="w-full flex justify-between">
                  <div className="w-6 h-6 border-b-2 border-l-2 border-white/80 rounded-bl-lg" />
                  <div className="w-6 h-6 border-b-2 border-r-2 border-white/80 rounded-br-lg" />
                </div>
              </div>

              {/* Verified Details Side */}
              <div className="flex-1 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-600">
                      Clock-In Confirmed
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                    Sarah Jenkins
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Senior Product Designer • ID: EMP-104
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Assigned Office
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-700" />
                      <span>HQ Main Office</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Timestamp
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-700" />
                      <span>09:00:24 AM</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Matched with <strong>MobileFaceNet L2 unit sphere</strong> vector ($D = 0.24$)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid (Monochrome Rounded-3xl Cards) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mb-4">
            Everything your company needs. Zero backend headaches.
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Engineered from the ground up for speed, strict room isolation, and instant real-time synchronization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-slate-50 border border-slate-200/80 p-8 rounded-3xl hover:bg-slate-100/60 transition-colors">
            <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center mb-6 shadow-md">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-950 mb-2">On-Device AI (MobileFaceNet)</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Inference runs directly on your Android phone or tablet via TensorFlow Lite. Scans take only 40ms, with 99.55% benchmark precision and zero external server dependency.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-50 border border-slate-200/80 p-8 rounded-3xl hover:bg-slate-100/60 transition-colors">
            <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center mb-6 shadow-md">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-950 mb-2">3-Office Multi-Tenancy</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every account can manage up to 3 distinct offices or branches. Employees are strictly locked to their assigned office — clock-in attempts at another branch are instantly denied.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-50 border border-slate-200/80 p-8 rounded-3xl hover:bg-slate-100/60 transition-colors">
            <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center mb-6 shadow-md">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-950 mb-2">One-Time Secret Passkeys</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Upon creating a room, a secret one-time web link is generated. Share it with branch managers to view attendance in real time without distributing account passwords.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA Card (Dark Slate 950 with White Rounded Button) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-slate-950 text-white rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-6 relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white !text-white">
              Ready to modernize your team's time tracking?
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Download FaceTrack DTR for Android, place a phone or tablet at your office entrance, and enable touchless check-ins in under 60 seconds.
            </p>

            <div className="pt-4 flex items-center justify-center">
              <a
                href="/facetrack.apk"
                download="facetrack.apk"
                className="inline-flex items-center justify-center gap-2.5 bg-white text-slate-950 hover:bg-slate-100 px-8 py-4 rounded-full font-bold text-sm shadow-xl transition-all duration-200 hover:-translate-y-0.5"
              >
                <Download className="w-4 h-4 text-slate-950" />
                <span>Download Android APK</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-slate-950 rounded-md flex items-center justify-center text-white text-[10px] font-black">
            F
          </div>
          <span className="font-bold text-slate-900">FaceTrack DTR</span>
          <span>• 100% Serverless Facial Attendance</span>
        </div>
        <div>
          <span>Powered by MobileFaceNet & Supabase</span>
        </div>
      </footer>
    </div>
  );
}
