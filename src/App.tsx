/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Component } from 'react';
import { 
  Users, 
  Calendar, 
  BarChart3, 
  Package, 
  FileText, 
  Plus, 
  Search, 
  Download, 
  LogOut, 
  Menu, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Banknote,
  History,
  Trash2,
  Edit2,
  Sun,
  Moon,
  Eye,
  EyeOff,
  UserCircle,
  Key,
  UserMinus,
  ShieldCheck,
  Camera,
  Upload,
  Stethoscope,
  MapPin,
  Phone,
  BadgeCheck,
  ClipboardList,
  PlusCircle,
  Mail,
  Printer,
  Inbox,
  ShieldAlert
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  setDoc,
  getDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { db, auth } from './firebase';
import { 
  Patient, 
  ServiceType, 
  SERVICE_PRICES, 
  Transaction, 
  Appointment, 
  InventoryItem 
} from './types';
import { cn, formatCurrency, formatDate } from './lib/utils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function getFirestoreErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('permission-denied') || raw.includes('PERMISSION_DENIED')) {
    return 'Permission denied. Please check Firestore security rules are deployed.';
  }
  if (raw.includes('not-found')) {
    return 'Document not found.';
  }
  if (raw.includes('unavailable') || raw.includes('offline')) {
    return 'Network error. Please check your connection.';
  }
  return raw;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): string {
  const message = getFirestoreErrorMessage(error);
  console.error(`Firestore ${operationType} error at ${path}:`, error);
  return message;
}

// --- Components ---

const LoginSignup = ({ darkMode }: { darkMode: boolean }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const getAuthErrorMessage = (errorCode: string, isLogin: boolean): string => {
    switch (errorCode) {
      case 'auth/invalid-credential':
        return isLogin
          ? 'Invalid email or password. Please check your credentials or sign up for a new account.'
          : 'Invalid credentials. Please try again.';
      case 'auth/user-not-found':
        return 'No account found with this email. Please sign up first.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed. Please try again.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled. Please contact the administrator.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!isLogin) {
      if (password.length < 6) {
        setError('Password should be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // non-fatal
        }
      }
    } catch (err: any) {
      const code = err.code || '';
      setError(getAuthErrorMessage(code, isLogin));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      const code = err.code || '';
      setError(getAuthErrorMessage(code, false));
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setInfo('');
    if (!email) {
      setError('Please enter your email address first, then click "Forgot password?".');
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo(`Password reset email sent to ${email}. Check your inbox.`);
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code || '', true));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center p-4 transition-colors duration-500",
      darkMode ? "bg-[#0f172a]" : "bg-[#f8fafc]"
    )}>
      <div className={cn(
        "w-full max-w-md p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border transition-all duration-500",
        darkMode ? "bg-slate-900/50 border-slate-800 backdrop-blur-xl" : "bg-white/80 border-slate-100 backdrop-blur-xl"
      )}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-500/20">
            <Users size={32} />
          </div>
          <h1 className={cn("text-3xl font-black tracking-tight mb-2", darkMode ? "text-white" : "text-slate-900")}>
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className={cn("text-sm font-medium", darkMode ? "text-slate-400" : "text-slate-500")}>
            {isLogin ? "Enter your credentials to access your dashboard" : "Join our dental management platform today"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-3">
            <AlertCircle size={18} />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {info && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium flex items-center gap-3">
            <CheckCircle2 size={18} />
            <span className="flex-1">{info}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={cn("block text-xs font-bold uppercase tracking-widest mb-2 ml-1", darkMode ? "text-slate-500" : "text-slate-400")}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "w-full px-5 py-4 rounded-2xl border outline-none transition-all font-medium",
                darkMode 
                  ? "bg-slate-800/50 border-slate-700 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" 
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              )}
              placeholder="name@company.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 ml-1">
              <label className={cn("block text-xs font-bold uppercase tracking-widest", darkMode ? "text-slate-500" : "text-slate-400")}>
                Password
              </label>
              {isLogin && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors disabled:opacity-50"
                >
                  {resetLoading ? "Sending..." : "Forgot password?"}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "w-full px-5 py-4 rounded-2xl border outline-none transition-all font-medium pr-12",
                  darkMode
                    ? "bg-slate-800/50 border-slate-700 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                )}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={cn(
                  "absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors",
                  darkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {!isLogin && (
              <p className={cn("mt-2 ml-1 text-xs font-medium", darkMode ? "text-slate-500" : "text-slate-400")}>
                Use at least 6 characters.
              </p>
            )}
          </div>

          {!isLogin && (
            <div>
              <label className={cn("block text-xs font-bold uppercase tracking-widest mb-2 ml-1", darkMode ? "text-slate-500" : "text-slate-400")}>
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  "w-full px-5 py-4 rounded-2xl border outline-none transition-all font-medium",
                  darkMode
                    ? "bg-slate-800/50 border-slate-700 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                )}
                placeholder="Re-enter password"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : (isLogin ? "Sign In" : "Create Account")}
          </button>
        </form>

        <div className="my-8 flex items-center gap-4">
          <div className={cn("flex-1 h-px", darkMode ? "bg-slate-800" : "bg-slate-100")}></div>
          <span className={cn("text-xs font-bold uppercase tracking-widest", darkMode ? "text-slate-600" : "text-slate-400")}>Or continue with</span>
          <div className={cn("flex-1 h-px", darkMode ? "bg-slate-800" : "bg-slate-100")}></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className={cn(
            "w-full py-4 rounded-2xl border font-bold flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 active:translate-y-0",
            darkMode 
              ? "bg-slate-800/50 border-slate-700 text-white hover:bg-slate-800" 
              : "bg-white border-slate-200 text-slate-900 hover:bg-slate-50 shadow-sm"
          )}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google Account
        </button>

        <p className={cn("text-center mt-8 text-sm font-medium", darkMode ? "text-slate-400" : "text-slate-500")}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); setInfo(''); setConfirmPassword(''); }}
            className="text-blue-500 font-bold hover:underline"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
};

const SidebarItem: React.FC<{ icon: any, label: string, active: boolean, onClick: () => void, darkMode: boolean }> = ({ icon: Icon, label, active, onClick, darkMode }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-300 group relative",
      active 
        ? darkMode 
          ? "sidebar-active-glow text-white" 
          : "bg-blue-600 text-white shadow-lg shadow-blue-200" 
        : darkMode 
          ? "text-slate-400 hover:bg-white/5 hover:text-white"
          : "text-slate-600 hover:bg-slate-100"
    )}
  >
    <Icon size={20} className={cn(
      "transition-colors duration-300",
      active ? "text-white" : darkMode ? "text-accent-teal group-hover:text-white" : "text-slate-600"
    )} />
    <span className="font-bold tracking-wide">{label}</span>
    {active && darkMode && (
      <div className="absolute right-0 w-1 h-6 bg-accent-teal rounded-l-full shadow-[0_0_15px_rgba(0,242,255,0.8)]"></div>
    )}
  </button>
);

const EmptyState = ({ message = "There is no data available", darkMode, icon: Icon = Inbox }: { message?: string, darkMode: boolean, icon?: any }) => (
  <div className={cn(
    "w-full flex flex-col items-center justify-center py-16 px-6 text-center",
    darkMode ? "text-slate-400" : "text-slate-500"
  )}>
    <div className={cn(
      "w-16 h-16 rounded-2xl flex items-center justify-center mb-4",
      darkMode ? "bg-white/5 border border-white/10" : "bg-slate-100"
    )}>
      <Icon size={28} />
    </div>
    <p className="font-bold text-base">{message}</p>
    <p className={cn("text-sm mt-1", darkMode ? "text-slate-500" : "text-slate-400")}>Records you add will appear here.</p>
  </div>
);

const StatCard = ({ label, value, icon: Icon, color, darkMode, glowClass, onClick }: { label: string, value: string | number, icon: any, color: string, darkMode: boolean, glowClass?: string, onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
    "p-4 md:p-6 rounded-2xl md:rounded-3xl border transition-all duration-500 group relative overflow-hidden text-left w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40",
    darkMode
      ? "glass-card glass-card-glow hover:scale-[1.02] " + glowClass
      : "bg-white border-slate-100 shadow-sm hover:shadow-md"
  )}>
    {darkMode && (
      <div className={cn(
        "absolute -bottom-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40",
        glowClass === 'glow-blue' ? "bg-accent-blue" :
        glowClass === 'glow-teal' ? "bg-accent-teal" :
        glowClass === 'glow-red' ? "bg-accent-red" :
        "bg-accent-green"
      )}></div>
    )}
    <div className="flex items-start justify-between relative z-10">
      <div className="min-w-0 flex-1">
        <p className={cn("text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1 md:mb-2 opacity-60 truncate", darkMode ? "text-slate-300" : "text-slate-500")}>{label}</p>
        <h3 className={cn("text-xl md:text-3xl font-black tracking-tight truncate", darkMode ? "text-white" : "text-slate-900")}>{value}</h3>
      </div>
      <div className={cn(
        "p-2.5 md:p-3.5 rounded-xl md:rounded-2xl shadow-inner transition-transform duration-500 group-hover:rotate-12 flex-shrink-0 ml-2",
        darkMode ? "bg-white/5 border border-white/10" : color
      )}>
        <Icon size={24} className={cn(darkMode ? (
          glowClass === 'glow-blue' ? "text-accent-blue" :
          glowClass === 'glow-teal' ? "text-accent-teal" :
          glowClass === 'glow-red' ? "text-accent-red" :
          "text-accent-green"
        ) : "text-white")} />
      </div>
    </div>
    {darkMode && (
      <div className="mt-4 flex items-center gap-2">
        <div className={cn(
          "w-2 h-2 rounded-full animate-pulse",
          glowClass === 'glow-blue' ? "bg-accent-blue" :
          glowClass === 'glow-teal' ? "bg-accent-teal" :
          glowClass === 'glow-red' ? "bg-accent-red" :
          "bg-accent-green"
        )}></div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Live Tracking</span>
      </div>
    )}
  </button>
);

// --- Main App ---

export default function App() {
  return (
    <AppContent />
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'appointments' | 'analytics' | 'inventory' | 'sheets' | 'profile' | 'prescriptions'>('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientFilter, setPatientFilter] = useState<'all' | 'unpaid'>('all');
  const [apptDateFilter, setApptDateFilter] = useState<string>('');

  // Theme Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setDoctorProfile(null);
      }
      setLoading(false);
    });

    // Firestore connectivity is verified by the onSnapshot listeners below

    return () => unsubscribe();
  }, []);

  // Doctor Profile Listener
  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'doctors', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setDoctorProfile(docSnap.data());
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Data Listeners
  useEffect(() => {
    if (!user) return;

    const unsubPatients = onSnapshot(query(collection(db, 'patients'), orderBy('createdAt', 'desc')), (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'patients'));

    const unsubAppointments = onSnapshot(query(collection(db, 'appointments'), orderBy('date', 'asc')), (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'appointments'));

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'inventory'));

    const unsubTransactions = onSnapshot(query(collection(db, 'transactions'), orderBy('date', 'desc')), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'transactions'));

    const unsubPrescriptions = onSnapshot(query(collection(db, 'prescriptions'), orderBy('date', 'desc')), (snapshot) => {
      setPrescriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'prescriptions'));

    return () => {
      unsubPatients();
      unsubAppointments();
      unsubInventory();
      unsubTransactions();
      unsubPrescriptions();
    };
  }, [user]);

  const handleLogout = () => signOut(auth);

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.serialNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.serviceType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = patientFilter === 'all' ? true : (p.amountDue - p.amountPaid) > 0;
      return matchesSearch && matchesFilter;
    });
  }, [patients, searchQuery, patientFilter]);

  const deletePatientWithRelated = async (patientId: string) => {
    await deleteDoc(doc(db, 'patients', patientId));
    const relatedQueries = [
      query(collection(db, 'transactions'), where('patientId', '==', patientId)),
      query(collection(db, 'appointments'), where('patientId', '==', patientId)),
      query(collection(db, 'prescriptions'), where('patientId', '==', patientId)),
    ];
    for (const q of relatedQueries) {
      const snap = await getDocs(q);
      if (snap.empty) continue;
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  };

  // Reconcile: hide records that point to a patient that no longer exists.
  // Keeps displayed aggregates (Total Revenue, etc.) consistent with the patients list
  // even while orphan cleanup is still in flight.
  const patientIdSet = useMemo(() => new Set(patients.map(p => p.id)), [patients]);

  const reconciledTransactions = useMemo(
    () => transactions.filter(t => !t.patientId || patientIdSet.has(t.patientId)),
    [transactions, patientIdSet]
  );

  const reconciledAppointments = useMemo(
    () => appointments.filter(a => !a.patientId || patientIdSet.has(a.patientId)),
    [appointments, patientIdSet]
  );

  // Auto-clean orphaned records in Firestore (one-shot per change).
  // Skips until initial loads land, then only runs when orphans are actually present.
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  useEffect(() => {
    if (user && patients.length >= 0 && transactions.length >= 0 && appointments.length >= 0 && !initialDataLoaded) {
      setInitialDataLoaded(true);
    }
  }, [user, patients, transactions, appointments, initialDataLoaded]);

  useEffect(() => {
    if (!user || !initialDataLoaded) return;
    const orphanTx = transactions.filter(t => t.patientId && !patientIdSet.has(t.patientId));
    const orphanAppt = appointments.filter(a => a.patientId && !patientIdSet.has(a.patientId));
    if (orphanTx.length === 0 && orphanAppt.length === 0) return;
    (async () => {
      try {
        const batch = writeBatch(db);
        orphanTx.forEach(t => batch.delete(doc(db, 'transactions', t.id)));
        orphanAppt.forEach(a => batch.delete(doc(db, 'appointments', a.id)));
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'orphan-cleanup');
      }
    })();
  }, [user, initialDataLoaded, transactions, appointments, patientIdSet]);

  const stats = useMemo(() => {
    const totalRevenue = reconciledTransactions
      .filter(t => t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
    const pendingPayments = patients.reduce((sum, p) => sum + (p.amountDue - p.amountPaid), 0);
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = reconciledAppointments.filter(a => a.date === today).length;
    return { totalRevenue, pendingPayments, todayAppointments, totalPatients: patients.length };
  }, [reconciledTransactions, reconciledAppointments, patients]);

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!user) return (
    <LoginSignup darkMode={darkMode} />
  );

  return (
    <div className={cn(
      "h-screen flex overflow-hidden transition-colors duration-300",
      darkMode ? "bg-dark-bg text-slate-100" : "bg-slate-50 text-slate-900"
    )}>
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "transition-all duration-300 flex flex-col border-r z-50",
        "fixed lg:static inset-y-0 left-0",
        isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full lg:w-20 lg:translate-x-0",
        darkMode ? "bg-dark-bg/95 lg:bg-dark-bg/80 backdrop-blur-xl border-white/10" : "bg-white border-slate-100"
      )}>
        <div className={cn("p-6 flex items-center gap-3", !isSidebarOpen && "lg:justify-center")}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-100">
            <Users size={20} className="text-white" />
          </div>
          {isSidebarOpen && <span className={cn("font-bold text-xl tracking-tight whitespace-nowrap", darkMode ? "text-white" : "text-slate-900")}>KHAN DENTAL</span>}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-hidden">
          {[
            { icon: BarChart3, tab: 'dashboard' as const, label: 'Dashboard' },
            { icon: Calendar, tab: 'appointments' as const, label: 'Appointments' },
            { icon: Users, tab: 'analytics' as const, label: 'Analytics' },
            { icon: ClipboardList, tab: 'prescriptions' as const, label: 'Prescriptions' },
            { icon: Package, tab: 'inventory' as const, label: 'Inventory' },
            { icon: FileText, tab: 'sheets' as const, label: 'Sheets' },
            { icon: UserCircle, tab: 'profile' as const, label: 'Profile' },
          ].map((item) => (
            <SidebarItem
              key={item.tab}
              icon={item.icon}
              label={isSidebarOpen ? item.label : ""}
              active={activeTab === item.tab}
              onClick={() => { setActiveTab(item.tab); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
              darkMode={darkMode}
            />
          ))}
        </nav>

        <div className={cn("p-4 border-t", darkMode ? "border-white/10" : "border-slate-100")}>
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all",
              darkMode ? "text-slate-400 hover:text-red-400 hover:bg-red-950/30" : "text-slate-500 hover:text-red-600 hover:bg-red-50"
            )}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background Glows for Dark Mode */}
        {darkMode && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-accent-blue/10 rounded-full blur-[150px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-accent-purple/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] bg-accent-teal/5 rounded-full blur-[100px]"></div>
            <div className="absolute top-[10%] left-[-10%] w-[120%] h-[2px] bg-gradient-to-r from-transparent via-accent-teal/20 to-transparent rotate-[-5deg] blur-sm"></div>
            <div className="absolute top-[15%] left-[-10%] w-[120%] h-[1px] bg-gradient-to-r from-transparent via-accent-blue/10 to-transparent rotate-[-3deg] blur-sm"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0)_0%,rgba(2,6,23,0.8)_100%)]"></div>
          </div>
        )}
        
        {/* Header */}
        <header className={cn(
          "h-16 md:h-20 border-b px-4 md:px-8 flex items-center justify-between flex-shrink-0 transition-colors z-10",
          darkMode ? "bg-dark-bg/40 backdrop-blur-md border-white/10" : "bg-white border-slate-100"
        )}>
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={cn("p-2 rounded-lg transition-colors flex-shrink-0", darkMode ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-500")}>
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search..."
                className={cn(
                  "w-full pl-10 pr-4 py-2 border-none rounded-xl focus:ring-2 focus:ring-blue-100 transition-all text-sm md:text-base",
                  darkMode ? "bg-white/5 text-white placeholder:text-slate-500 border border-white/10" : "bg-slate-50 text-slate-900"
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={cn(
                "p-2 md:p-2.5 rounded-xl transition-all duration-300",
                darkMode ? "bg-white/10 text-amber-400 hover:bg-white/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className={cn("text-sm font-bold", darkMode ? "text-white" : "text-slate-900")}>{doctorProfile?.displayName || user.displayName || 'Doctor'}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <img
                src={doctorProfile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=2563eb&color=fff`}
                alt="Profile"
                className="w-9 h-9 md:w-10 md:h-10 rounded-xl border-2 border-white shadow-sm object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 z-10">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className={cn("text-2xl md:text-3xl font-bold", darkMode ? "text-white" : "text-slate-900")}>Welcome Back, {user.displayName ? `Dr. ${user.displayName.split(' ')[0]}` : 'Doctor'} 👋</h2>
                  <p className="text-slate-500 text-sm md:text-base">Manage your patients and payments</p>
                </div>
                <button
                  onClick={() => { setEditingPatient(null); setShowAddModal(true); }}
                  className="bg-blue-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100 text-sm md:text-base self-start sm:self-auto"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Add New Patient</span>
                  <span className="sm:hidden">Add Patient</span>
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <StatCard
                  label="Today's Appointments"
                  value={stats.todayAppointments}
                  icon={Calendar}
                  color="bg-blue-500"
                  darkMode={darkMode}
                  glowClass="glow-blue"
                  onClick={() => {
                    setApptDateFilter(new Date().toISOString().split('T')[0]);
                    setActiveTab('appointments');
                  }}
                />
                <StatCard
                  label="Total Revenue"
                  value={formatCurrency(stats.totalRevenue)}
                  icon={Banknote}
                  color="bg-teal-500"
                  darkMode={darkMode}
                  glowClass="glow-teal"
                  onClick={() => setActiveTab('analytics')}
                />
                <StatCard
                  label="Pending Payments"
                  value={formatCurrency(stats.pendingPayments)}
                  icon={AlertCircle}
                  color="bg-red-500"
                  darkMode={darkMode}
                  glowClass="glow-red"
                  onClick={() => {
                    setPatientFilter('unpaid');
                    setActiveTab('dashboard');
                  }}
                />
                <StatCard
                  label="Active Patients"
                  value={stats.totalPatients}
                  icon={Users}
                  color="bg-green-500"
                  darkMode={darkMode}
                  glowClass="glow-green"
                  onClick={() => {
                    setPatientFilter('all');
                    setActiveTab('dashboard');
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("text-xs font-bold uppercase tracking-wider", darkMode ? "text-slate-400" : "text-slate-500")}>Filter:</span>
                <button
                  onClick={() => setPatientFilter('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                    patientFilter === 'all'
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : darkMode ? "bg-white/5 text-slate-300 hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >All Patients</button>
                <button
                  onClick={() => setPatientFilter('unpaid')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                    patientFilter === 'unpaid'
                      ? "bg-red-600 text-white shadow-md shadow-red-200"
                      : darkMode ? "bg-white/5 text-slate-300 hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >Pending Payments</button>
              </div>

              <div className={cn(
                "rounded-2xl border shadow-sm overflow-hidden transition-all duration-300",
                darkMode ? "glass-card" : "bg-white border-slate-100"
              )}>
                {filteredPatients.length === 0 ? (
                  <EmptyState
                    darkMode={darkMode}
                    icon={Users}
                    message={
                      patients.length === 0
                        ? "There is no data available"
                        : patientFilter === 'unpaid'
                          ? "No patients with pending payments"
                          : "No patients match your search"
                    }
                  />
                ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className={cn("border-b transition-colors", darkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-100")}>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Serial No</th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Name</th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Service Type</th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Payment</th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y transition-colors", darkMode ? "divide-white/10" : "divide-slate-100")}>
                    {filteredPatients.map((patient, idx) => (
                      <tr key={patient.id} className={cn("transition-colors", darkMode ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                        <td className="px-4 md:px-6 py-3 md:py-4 font-mono text-sm text-slate-500">{idx + 1}</td>
                        <td className="px-4 md:px-6 py-3 md:py-4">
                          <p className={cn("font-bold", darkMode ? "text-white" : "text-slate-900")}>{patient.name}</p>
                          <p className="text-xs text-slate-500">{formatDate(patient.createdAt)}</p>
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap",
                            darkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"
                          )}>
                            {patient.serviceType}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4">
                          <p className={cn("text-sm font-extrabold whitespace-nowrap", darkMode ? "text-white" : "text-slate-900")}>{formatCurrency(patient.amountPaid)} / {formatCurrency(patient.amountDue)}</p>
                          <div className={cn("w-full h-1.5 rounded-full mt-1", darkMode ? "bg-white/10" : "bg-slate-100")}>
                            <div
                              className="bg-blue-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min((patient.amountPaid / patient.amountDue) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4">
                          {patient.status === 'Paid' ? (
                            <span className="flex items-center gap-1 text-emerald-500 font-bold text-sm whitespace-nowrap">
                              <CheckCircle2 size={16} /> Paid
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-500 font-bold text-sm whitespace-nowrap">
                              <AlertCircle size={16} /> Unpaid
                            </span>
                          )}
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4">
                          <div className="flex items-center gap-1 md:gap-2">
                            <button 
                              onClick={() => { setEditingPatient(patient); setShowAddModal(true); }}
                              className={cn("p-2 rounded-lg transition-colors", darkMode ? "hover:bg-blue-900/30 text-blue-400" : "hover:bg-blue-50 text-blue-600")}
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => generateInvoice(patient)}
                              className={cn("p-2 rounded-lg transition-colors", darkMode ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-600")}
                              title="Download PDF"
                            >
                              <Download size={18} />
                            </button>
                            <button 
                              onClick={async () => {
                                try {
                                  const emailHtml = `
                                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                                      <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
                                        <h1 style="margin: 0;">KHAN DENTAL</h1>
                                        <p style="margin: 4px 0 0 0; opacity: 0.8;">Invoice / Receipt</p>
                                      </div>
                                      <div style="padding: 24px;">
                                        <p><strong>Patient:</strong> ${patient.name}</p>
                                        <p><strong>Serial No:</strong> ${patient.serialNo}</p>
                                        <p><strong>Service:</strong> ${patient.serviceType}</p>
                                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                          <span>Total Due:</span>
                                          <span style="font-weight: bold;">${formatCurrency(patient.amountDue)}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                          <span>Amount Paid:</span>
                                          <span style="font-weight: bold; color: #10b981;">${formatCurrency(patient.amountPaid)}</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 2px solid #f1f5f9; margin-top: 8px;">
                                          <span style="font-weight: bold;">Balance:</span>
                                          <span style="font-weight: bold; color: #ef4444;">${formatCurrency(patient.amountDue - patient.amountPaid)}</span>
                                        </div>
                                      </div>
                                      <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                                        Thank you for choosing Khan Dental!
                                      </div>
                                    </div>
                                  `;
                                  await sendEmail(patient.email, `Invoice from Khan Dental - ${patient.serialNo}`, emailHtml);
                                  alert('Invoice sent to patient email successfully!');
                                } catch (err: any) {
                                  alert('Failed to send invoice: ' + err.message);
                                }
                              }}
                              className={cn("p-2 rounded-lg transition-colors", darkMode ? "hover:bg-blue-900/30 text-blue-400" : "hover:bg-blue-50 text-blue-600")}
                              title="Email Invoice"
                            >
                              <Mail size={18} />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm("Are you sure you want to delete this patient? This will also remove their transactions, appointments, and prescriptions.")) {
                                  try {
                                    await deletePatientWithRelated(patient.id);
                                  } catch (error) {
                                    const msg = handleFirestoreError(error, OperationType.DELETE, `patients/${patient.id}`);
                                    alert(msg);
                                  }
                                }
                              }}
                              className={cn("p-2 rounded-lg transition-colors", darkMode ? "hover:bg-red-900/30 text-red-400" : "hover:bg-red-50 text-red-600")}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && <AnalyticsView transactions={reconciledTransactions} patients={patients} darkMode={darkMode} />}
          {activeTab === 'inventory' && <InventoryView inventory={inventory} darkMode={darkMode} />}
          {activeTab === 'appointments' && <AppointmentsView appointments={reconciledAppointments} patients={patients} darkMode={darkMode} dateFilter={apptDateFilter} onDateFilterChange={setApptDateFilter} />}
          {activeTab === 'prescriptions' && <PrescriptionsView patients={patients} prescriptions={prescriptions} doctorProfile={doctorProfile} user={user} darkMode={darkMode} />}
          {activeTab === 'sheets' && <SheetsView transactions={reconciledTransactions} darkMode={darkMode} />}
          {activeTab === 'profile' && <ProfileView user={user} darkMode={darkMode} />}
        </div>
      </main>

      {/* Add/Edit Patient Modal */}
      {showAddModal && (
        <AddPatientModal 
          onClose={() => setShowAddModal(false)} 
          patient={editingPatient}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

// --- Sub-Views ---

function AddPatientModal({ onClose, patient, darkMode }: { onClose: () => void, patient: Patient | null, darkMode: boolean }) {
  const [formData, setFormData] = useState({
    name: patient?.name || '',
    email: patient?.email || '',
    serviceType: patient?.serviceType || ServiceType.CLEANING,
    amountDue: patient?.amountDue || SERVICE_PRICES[ServiceType.CLEANING],
    amountPaid: patient?.amountPaid || 0,
    paymentType: patient?.paymentType || 'Direct' as const,
    medicalHistory: patient?.medicalHistory?.join(', ') || '',
    allergies: patient?.allergies?.join(', ') || '',
    chronicConditions: patient?.chronicConditions?.join(', ') || '',
  });

  const [installments, setInstallments] = useState(patient?.installments || []);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const service = e.target.value as ServiceType;
    setFormData({
      ...formData,
      serviceType: service,
      amountDue: SERVICE_PRICES[service]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const status = formData.amountPaid >= formData.amountDue ? 'Paid' : 'Unpaid';
    const patientData = {
      serialNo: patient?.serialNo || `KD-${Date.now().toString().slice(-6)}`,
      name: formData.name,
      email: formData.email,
      serviceType: formData.serviceType,
      amountDue: formData.amountDue,
      amountPaid: formData.amountPaid,
      paymentType: formData.paymentType,
      status,
      installments,
      medicalHistory: formData.medicalHistory.split(',').map(s => s.trim()).filter(s => s !== ''),
      allergies: formData.allergies.split(',').map(s => s.trim()).filter(s => s !== ''),
      chronicConditions: formData.chronicConditions.split(',').map(s => s.trim()).filter(s => s !== ''),
      updatedAt: new Date().toISOString(),
      createdAt: patient?.createdAt || new Date().toISOString(),
    };

    try {
      if (patient) {
        await updateDoc(doc(db, 'patients', patient.id), patientData);
      } else {
        const docRef = await addDoc(collection(db, 'patients'), patientData);
        if (formData.amountPaid > 0) {
          await addDoc(collection(db, 'transactions'), {
            patientId: docRef.id,
            patientName: formData.name,
            amount: formData.amountPaid,
            type: 'Income',
            category: 'Treatment',
            date: new Date().toISOString().split('T')[0],
            description: `Initial payment for ${formData.serviceType}`
          });
        }
      }
      onClose();
    } catch (err) {
      const msg = handleFirestoreError(err, patient ? OperationType.UPDATE : OperationType.CREATE, patient ? `patients/${patient.id}` : 'patients');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className={cn(
        "rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto! transition-all duration-300",
        darkMode ? "glass-card" : "bg-white"
      )}>
        <div className={cn(
          "p-4 md:p-8 border-b flex items-center justify-between sticky top-0 z-10 transition-colors",
          darkMode ? "bg-dark-bg/80 backdrop-blur-md border-white/10" : "bg-white border-slate-100"
        )}>
          <h2 className={cn("text-xl md:text-2xl font-bold", darkMode ? "text-white" : "text-slate-900")}>{patient ? 'Edit Patient' : 'Add New Patient'}</h2>
          <button onClick={onClose} className={cn("p-2 rounded-full transition-colors", darkMode ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-500")}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-5 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Patient Name</label>
              <input 
                required
                type="text" 
                className={cn(
                  "w-full px-4 py-3 border-none rounded-xl focus:ring-2 focus:ring-blue-100 transition-all",
                  darkMode ? "bg-white/5 text-white placeholder:text-slate-500 border border-white/10" : "bg-slate-50 text-slate-900"
                )}
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Patient Email</label>
              <input 
                required
                type="email" 
                className={cn(
                  "w-full px-4 py-3 border-none rounded-xl focus:ring-2 focus:ring-blue-100 transition-all",
                  darkMode ? "bg-white/5 text-white placeholder:text-slate-500 border border-white/10" : "bg-slate-50 text-slate-900"
                )}
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Service Type</label>
              <select 
                className={cn(
                  "w-full px-4 py-3 border-none rounded-xl focus:ring-2 focus:ring-blue-100 transition-all",
                  darkMode ? "bg-white/5 text-white border border-white/10 [&>option]:bg-slate-900" : "bg-slate-50 text-slate-900"
                )}
                value={formData.serviceType}
                onChange={handleServiceChange}
              >
                {Object.values(ServiceType).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Amount Due</label>
              <input 
                type="number" 
                className={cn(
                  "w-full px-4 py-3 border-none rounded-xl focus:ring-2 focus:ring-blue-100 transition-all",
                  darkMode ? "bg-white/5 text-white border border-white/10" : "bg-slate-50 text-slate-900"
                )}
                value={formData.amountDue}
                onChange={e => setFormData({...formData, amountDue: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Amount Paid</label>
              <input 
                type="number" 
                className={cn(
                  "w-full px-4 py-3 border-none rounded-xl focus:ring-2 focus:ring-blue-100 transition-all",
                  darkMode ? "bg-white/5 text-white border border-white/10" : "bg-slate-50 text-slate-900"
                )}
                value={formData.amountPaid || ''}
                onChange={e => setFormData({...formData, amountPaid: Number(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Payment Type</label>
              <select 
                className={cn(
                  "w-full px-4 py-3 border-none rounded-xl focus:ring-2 focus:ring-blue-100 transition-all",
                  darkMode ? "bg-white/5 text-white border border-white/10 [&>option]:bg-slate-900" : "bg-slate-50 text-slate-900"
                )}
                value={formData.paymentType}
                onChange={e => setFormData({...formData, paymentType: e.target.value as any})}
              >
                <option value="Direct">Direct Payment</option>
                <option value="Installments">Installments</option>
              </select>
            </div>
          </div>

          {formData.paymentType === 'Installments' && (
            <div className={cn("p-6 rounded-2xl space-y-4 transition-colors", darkMode ? "bg-white/5 border border-white/10" : "bg-slate-50")}>
              <div className="flex items-center justify-between">
                <h3 className={cn("font-bold", darkMode ? "text-white" : "text-slate-900")}>Installments Tracker</h3>
                <button 
                  type="button"
                  onClick={() => setInstallments([...installments, { week: installments.length + 1, amount: 0, date: new Date().toISOString().split('T')[0] }])}
                  className="text-blue-600 text-sm font-bold hover:underline"
                >
                  + Add Week
                </button>
              </div>
              <div className="space-y-3">
                {installments.map((inst, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="text-sm font-bold text-slate-500 w-16">Week {inst.week}</span>
                    <input 
                      type="number" 
                      placeholder="Amount"
                      className={cn(
                        "flex-1 px-4 py-2 border-none rounded-lg text-sm transition-all",
                        darkMode ? "bg-white/10 text-white border border-white/10" : "bg-white"
                      )}
                      value={inst.amount}
                      onChange={e => {
                        const newInsts = [...installments];
                        newInsts[idx].amount = Number(e.target.value);
                        setInstallments(newInsts);
                        // Update total paid
                        const total = newInsts.reduce((sum, i) => sum + i.amount, 0);
                        setFormData(prev => ({ ...prev, amountPaid: total }));
                      }}
                    />
                    <input 
                      type="date" 
                      className={cn(
                        "px-4 py-2 border-none rounded-lg text-sm transition-all",
                        darkMode ? "bg-white/10 text-white border border-white/10" : "bg-white"
                      )}
                      value={inst.date}
                      onChange={e => {
                        const newInsts = [...installments];
                        newInsts[idx].date = e.target.value;
                        setInstallments(newInsts);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className={cn("font-bold border-b pb-2 transition-colors", darkMode ? "text-white border-white/10" : "text-slate-900 border-slate-100")}>Medical Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Allergies</label>
                <input 
                  type="text" 
                  placeholder="e.g. Penicillin, Latex"
                  className={cn(
                    "w-full px-4 py-3 border-none rounded-xl focus:ring-2 focus:ring-blue-100 transition-all",
                    darkMode ? "bg-white/5 text-white placeholder:text-slate-500 border border-white/10" : "bg-slate-50 text-slate-900"
                  )}
                  value={formData.allergies}
                  onChange={e => setFormData({...formData, allergies: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Chronic Conditions</label>
                <input 
                  type="text" 
                  placeholder="e.g. Diabetes, High BP"
                  className={cn(
                    "w-full px-4 py-3 border-none rounded-xl focus:ring-2 focus:ring-blue-100 transition-all",
                    darkMode ? "bg-white/5 text-white placeholder:text-slate-500 border border-white/10" : "bg-slate-50 text-slate-900"
                  )}
                  value={formData.chronicConditions}
                  onChange={e => setFormData({...formData, chronicConditions: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Medical History (comma separated)</label>
              <textarea 
                rows={3}
                className={cn(
                  "w-full px-4 py-3 border-none rounded-xl focus:ring-2 focus:ring-blue-100 transition-all",
                  darkMode ? "bg-white/5 text-white placeholder:text-slate-500 border border-white/10" : "bg-slate-50 text-slate-900"
                )}
                value={formData.medicalHistory}
                onChange={e => setFormData({...formData, medicalHistory: e.target.value})}
              />
            </div>
          </div>

          <div className={cn(
            "flex gap-4 pt-4 sticky bottom-0 z-10 transition-colors",
            darkMode ? "bg-dark-bg/80 backdrop-blur-md" : "bg-white"
          )}>
            <button 
              type="button" 
              onClick={onClose}
              className={cn(
                "flex-1 px-6 py-4 border rounded-xl font-bold transition-all",
                darkMode ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cn("flex-1 px-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100", saving && "opacity-50 cursor-not-allowed")}
            >
              {saving ? 'Saving...' : (patient ? 'Update Patient' : 'Save Patient')}
            </button>
          </div>
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function AnalyticsView({ transactions, patients, darkMode }: { transactions: Transaction[], patients: Patient[], darkMode: boolean }) {
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenue = new Array(12).fill(0);
    const expenses = new Array(12).fill(0);

    transactions.forEach(t => {
      const month = new Date(t.date).getMonth();
      if (t.type === 'Income') revenue[month] += t.amount;
      else expenses[month] += t.amount;
    });

    return { months, revenue, expenses };
  }, [transactions]);

  const serviceDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    patients.forEach(p => {
      counts[p.serviceType] = (counts[p.serviceType] || 0) + 1;
    });
    return {
      labels: Object.keys(counts),
      data: Object.values(counts)
    };
  }, [patients]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: darkMode ? '#94a3b8' : '#64748b',
          font: { weight: 'bold' as const }
        }
      }
    },
    scales: {
      x: {
        grid: { color: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
        ticks: { color: darkMode ? '#94a3b8' : '#64748b' }
      },
      y: {
        grid: { color: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
        ticks: { color: darkMode ? '#94a3b8' : '#64748b' }
      }
    }
  };

  const hasData = transactions.length > 0 || patients.length > 0;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h2 className={cn("text-2xl md:text-3xl font-black tracking-tight", darkMode ? "text-white" : "text-slate-900")}>Analytics & Insights</h2>
        <p className={cn("mt-1 font-medium text-sm md:text-base", darkMode ? "text-slate-400" : "text-slate-500")}>Financial performance and service trends</p>
      </div>

      {!hasData ? (
        <div className={cn(
          "rounded-2xl md:rounded-3xl border overflow-hidden",
          darkMode ? "glass-card border-white/10" : "bg-white border-slate-100 shadow-sm"
        )}>
          <EmptyState darkMode={darkMode} icon={BarChart3} />
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        <div className={cn(
          "p-4 md:p-8 rounded-2xl md:rounded-3xl border transition-all shadow-xl",
          darkMode ? "glass-card border-white/10" : "bg-white border-slate-100 shadow-sm"
        )}>
          <h3 className={cn("font-bold mb-4 md:mb-6 text-sm md:text-base", darkMode ? "text-white" : "text-slate-900")}>Monthly Revenue vs Expenses</h3>
          <Bar 
            data={{
              labels: monthlyData.months,
              datasets: [
                { 
                  label: 'Revenue', 
                  data: monthlyData.revenue, 
                  backgroundColor: darkMode ? '#2dd4bf' : '#2563eb', 
                  borderRadius: 6 
                },
                { 
                  label: 'Expenses', 
                  data: monthlyData.expenses, 
                  backgroundColor: darkMode ? '#a855f7' : '#94a3b8', 
                  borderRadius: 6 
                }
              ]
            }}
            options={chartOptions}
          />
        </div>

        <div className={cn(
          "p-4 md:p-8 rounded-2xl md:rounded-3xl border transition-all shadow-xl",
          darkMode ? "glass-card border-white/10" : "bg-white border-slate-100 shadow-sm"
        )}>
          <h3 className={cn("font-bold mb-4 md:mb-6 text-sm md:text-base", darkMode ? "text-white" : "text-slate-900")}>Service Distribution</h3>
          <div className="max-w-xs mx-auto">
            <Pie 
              data={{
                labels: serviceDistribution.labels,
                datasets: [{
                  data: serviceDistribution.data,
                  backgroundColor: darkMode 
                    ? ['#2dd4bf', '#a855f7', '#3b82f6', '#f59e0b', '#ef4444', '#10b981']
                    : ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'],
                  borderWidth: 0
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                    labels: {
                      color: darkMode ? '#94a3b8' : '#64748b',
                      font: { weight: 'bold' as const }
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function InventoryView({ inventory, darkMode }: { inventory: InventoryItem[], darkMode: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'PPE & Disposables', medicineType: '', quantity: 0, unit: 'pcs', minThreshold: 5, purchasePrice: 0, company: '' });
  const [error, setError] = useState('');

  const INVENTORY_CATEGORIES = [
    "Medicine",
    "Anesthetics & Sedation",
    "Diagnostic & Examination",
    "Restorative & Fillings",
    "Endodontics (Root Canal)",
    "Periodontics (Gums)",
    "Oral Surgery & Extraction",
    "Prosthodontics (Crowns/Bridges)",
    "Orthodontics (Braces)",
    "PPE & Disposables",
    "Sterilization & Hygiene",
    "Laboratory Supplies",
    "Dental Handpieces & Burs",
    "Preventive Care"
  ];

  const MEDICINE_TYPES = [
    "Analgesics (Pain Relief)",
    "Antibiotics (Infection Control)",
    "Antifungals",
    "Antivirals",
    "Anesthetics (Local/Topical)",
    "Corticosteroids (Anti-inflammatory)",
    "Hemostatics (Clotting Agents)",
    "Sedatives & Anxiolytics",
    "Fluorides & Preventive Agents",
    "Therapeutic Mouthrinses",
    "Desensitizing Agents"
  ];

  const INVENTORY_UNITS = [
    "pcs",
    "box",
    "bottle",
    "pack",
    "tube",
    "kit",
    "roll",
    "ml",
    "gm",
    "vial",
    "set"
  ];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await addDoc(collection(db, 'inventory'), {
        name: newItem.name,
        category: newItem.category,
        medicineType: newItem.category === 'Medicine' ? newItem.medicineType : '',
        quantity: newItem.quantity,
        unit: newItem.unit,
        minThreshold: newItem.minThreshold,
        purchasePrice: newItem.purchasePrice,
        company: newItem.company,
        lastRestocked: new Date().toISOString()
      });

      const totalCost = (newItem.purchasePrice || 0) * (newItem.quantity || 0);
      if (totalCost > 0) {
        await addDoc(collection(db, 'transactions'), {
          patientId: '',
          patientName: newItem.company || 'Inventory',
          amount: totalCost,
          type: 'Expense',
          category: 'Inventory Purchase',
          date: new Date().toISOString().split('T')[0],
          description: `Purchased ${newItem.quantity} ${newItem.unit} of ${newItem.name}${newItem.company ? ` from ${newItem.company}` : ''}`
        });
      }

      setShowAdd(false);
      setNewItem({ name: '', category: 'PPE & Disposables', medicineType: '', quantity: 0, unit: 'pcs', minThreshold: 5, purchasePrice: 0, company: '' });
    } catch (err) {
      const msg = handleFirestoreError(err, OperationType.CREATE, 'inventory');
      setError(msg);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={cn("text-2xl md:text-3xl font-black tracking-tight", darkMode ? "text-white" : "text-slate-900")}>Stock & Inventory</h2>
          <p className={cn("mt-1 font-medium text-sm md:text-base", darkMode ? "text-slate-400" : "text-slate-500")}>Track your dental supplies</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-blue-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100/20 text-sm md:text-base self-start sm:self-auto"
        >
          <Plus size={18} /> Add Item
        </button>
      </div>

      {inventory.length === 0 ? (
        <div className={cn(
          "rounded-2xl md:rounded-3xl border overflow-hidden",
          darkMode ? "glass-card border-white/10" : "bg-white border-slate-100 shadow-sm"
        )}>
          <EmptyState darkMode={darkMode} icon={Package} />
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {inventory.map(item => (
          <div key={item.id} className={cn(
            "p-6 rounded-3xl border transition-all duration-300 group hover:scale-[1.02]",
            darkMode ? "glass-card border-white/10 hover:border-accent-teal/30" : "bg-white border-slate-100 shadow-sm hover:shadow-md"
          )}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className={cn("font-bold text-lg", darkMode ? "text-white" : "text-slate-900")}>{item.name}</h3>
                <div className="flex flex-wrap gap-1 mt-2 mb-2">
                  <p className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    darkMode ? "bg-accent-teal/10 text-accent-teal" : "bg-blue-50 text-blue-600"
                  )}>{item.category}</p>
                  {item.category === 'Medicine' && item.medicineType && (
                    <p className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      darkMode ? "bg-accent-purple/10 text-accent-purple" : "bg-emerald-50 text-emerald-600"
                    )}>{item.medicineType}</p>
                  )}
                </div>
                <p className={cn("text-xs font-medium", darkMode ? "text-slate-500" : "text-slate-400")}>Last restocked: {formatDate(item.lastRestocked)}</p>
                {item.company && (
                  <p className={cn("text-xs font-bold mt-1", darkMode ? "text-slate-300" : "text-slate-600")}>Supplier: {item.company}</p>
                )}
              </div>
              <div className={cn(
                "p-3 rounded-2xl transition-colors",
                darkMode ? "bg-white/5 text-accent-teal group-hover:bg-accent-teal/10" : "bg-blue-50 text-blue-500"
              )}>
                <Package size={24} />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className={cn("text-3xl font-black", darkMode ? "text-white" : "text-slate-900")}>
                  {item.quantity} <span className={cn("text-sm font-medium", darkMode ? "text-slate-500" : "text-slate-400")}>{item.unit}</span>
                </p>
                {typeof item.purchasePrice === 'number' && item.purchasePrice > 0 && (
                  <p className={cn("text-xs font-medium mt-1", darkMode ? "text-slate-400" : "text-slate-500")}>
                    {formatCurrency(item.purchasePrice)} / {item.unit}
                  </p>
                )}
                {item.quantity <= item.minThreshold && (
                  <p className="text-orange-500 text-xs font-bold mt-2 flex items-center gap-1.5 animate-pulse">
                    <AlertCircle size={14} /> Low Stock
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      await updateDoc(doc(db, 'inventory', item.id), { quantity: item.quantity + 1 });
                    } catch (error) {
                      alert(handleFirestoreError(error, OperationType.UPDATE, `inventory/${item.id}`));
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    darkMode ? "bg-white/5 text-accent-teal hover:bg-accent-teal/20" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  )}
                >
                  <Plus size={18} />
                </button>
                <button
                  onClick={async () => {
                    try {
                      await updateDoc(doc(db, 'inventory', item.id), { quantity: Math.max(0, item.quantity - 1) });
                    } catch (error) {
                      alert(handleFirestoreError(error, OperationType.UPDATE, `inventory/${item.id}`));
                    }
                  }}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    darkMode ? "bg-white/5 text-slate-400 hover:bg-red-500/20 hover:text-red-400" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAdd} className={cn(
            "rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl transition-all duration-300",
            darkMode ? "glass-card" : "bg-white"
          )}>
            <h2 className={cn("text-2xl font-bold", darkMode ? "text-white" : "text-slate-900")}>Add Inventory Item</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Item Name</label>
                <input 
                  required 
                  type="text" 
                  className={cn(
                    "w-full px-4 py-3 border-none rounded-xl transition-all",
                    darkMode ? "bg-white/5 text-white placeholder:text-slate-500 border border-white/10" : "bg-slate-50 text-slate-900"
                  )}
                  value={newItem.name} 
                  onChange={e => setNewItem({...newItem, name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Category</label>
                <select 
                  required 
                  className={cn(
                    "w-full px-4 py-3 border-none rounded-xl transition-all",
                    darkMode ? "bg-white/5 text-white border border-white/10 [&>option]:bg-slate-900" : "bg-slate-50 text-slate-900"
                  )}
                  value={newItem.category} 
                  onChange={e => {
                    const cat = e.target.value;
                    setNewItem({
                      ...newItem, 
                      category: cat,
                      medicineType: cat === 'Medicine' ? MEDICINE_TYPES[0] : ''
                    });
                  }}
                >
                  {INVENTORY_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              {newItem.category === 'Medicine' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Medicine Type</label>
                  <select 
                    required 
                    className={cn(
                      "w-full px-4 py-3 border-none rounded-xl transition-all",
                      darkMode ? "bg-white/5 text-white border border-white/10 [&>option]:bg-slate-900" : "bg-slate-50 text-slate-900"
                    )}
                    value={newItem.medicineType} 
                    onChange={e => setNewItem({...newItem, medicineType: e.target.value})}
                  >
                    {MEDICINE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Quantity</label>
                  <input 
                    required 
                    type="number" 
                    className={cn(
                      "w-full px-4 py-3 border-none rounded-xl transition-all",
                      darkMode ? "bg-white/5 text-white border border-white/10" : "bg-slate-50 text-slate-900"
                    )}
                    value={newItem.quantity} 
                    onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Unit</label>
                  <select
                    required
                    className={cn(
                      "w-full px-4 py-3 border-none rounded-xl transition-all",
                      darkMode ? "bg-white/5 text-white border border-white/10 [&>option]:bg-slate-900" : "bg-slate-50 text-slate-900"
                    )}
                    value={newItem.unit}
                    onChange={e => setNewItem({...newItem, unit: e.target.value})}
                  >
                    {INVENTORY_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Purchase Price (per unit)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={cn(
                      "w-full px-4 py-3 border-none rounded-xl transition-all",
                      darkMode ? "bg-white/5 text-white placeholder:text-slate-500 border border-white/10" : "bg-slate-50 text-slate-900"
                    )}
                    value={newItem.purchasePrice || ''}
                    onChange={e => setNewItem({...newItem, purchasePrice: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Company / Supplier</label>
                  <input
                    type="text"
                    placeholder="e.g. 3M, Dentsply"
                    className={cn(
                      "w-full px-4 py-3 border-none rounded-xl transition-all",
                      darkMode ? "bg-white/5 text-white placeholder:text-slate-500 border border-white/10" : "bg-slate-50 text-slate-900"
                    )}
                    value={newItem.company}
                    onChange={e => setNewItem({...newItem, company: e.target.value})}
                  />
                </div>
              </div>
              {newItem.purchasePrice > 0 && newItem.quantity > 0 && (
                <div className={cn(
                  "p-3 rounded-xl text-sm font-medium flex items-center justify-between",
                  darkMode ? "bg-white/5 text-slate-300 border border-white/10" : "bg-slate-50 text-slate-700"
                )}>
                  <span>Total purchase cost:</span>
                  <span className="font-black">{formatCurrency(newItem.purchasePrice * newItem.quantity)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className={cn(
                  "flex-1 py-3 border rounded-xl font-bold transition-all",
                  darkMode ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100/20 hover:bg-blue-700 transition-all"
              >
                Save
              </button>
            </div>
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

function AppointmentsView({ appointments, patients, darkMode, dateFilter, onDateFilterChange }: { appointments: Appointment[], patients: Patient[], darkMode: boolean, dateFilter: string, onDateFilterChange: (d: string) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newAppt, setNewAppt] = useState({ patientId: '', date: '', time: '', serviceType: ServiceType.CLEANING });
  const [error, setError] = useState('');

  const visibleAppointments = useMemo(() => {
    if (!dateFilter) return appointments;
    return appointments.filter(a => a.date === dateFilter);
  }, [appointments, dateFilter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const patient = patients.find(p => p.id === newAppt.patientId);
    try {
      await addDoc(collection(db, 'appointments'), {
        patientId: newAppt.patientId,
        date: newAppt.date,
        time: newAppt.time,
        serviceType: newAppt.serviceType,
        patientName: patient?.name || 'Unknown',
        status: 'Scheduled'
      });
      setShowAdd(false);
    } catch (err) {
      const msg = handleFirestoreError(err, OperationType.CREATE, 'appointments');
      setError(msg);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={cn("text-2xl md:text-3xl font-black tracking-tight", darkMode ? "text-white" : "text-slate-900")}>Appointment Calendar</h2>
          <p className={cn("mt-1 font-medium text-sm md:text-base", darkMode ? "text-slate-400" : "text-slate-500")}>Manage upcoming patient visits</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-blue-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100/20 text-sm md:text-base self-start sm:self-auto"
        >
          <Plus size={18} /> <span className="hidden sm:inline">Schedule Appointment</span><span className="sm:hidden">Schedule</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("text-xs font-bold uppercase tracking-wider", darkMode ? "text-slate-400" : "text-slate-500")}>Filter by date:</span>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => onDateFilterChange(e.target.value)}
          className={cn(
            "px-3 py-1.5 rounded-xl text-sm font-medium border outline-none transition-all",
            darkMode ? "bg-white/5 text-white border-white/10" : "bg-white text-slate-900 border-slate-200"
          )}
        />
        {dateFilter && (
          <button
            onClick={() => onDateFilterChange('')}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
              darkMode ? "bg-white/5 text-slate-300 hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >Clear</button>
        )}
      </div>

      <div className={cn(
        "rounded-2xl md:rounded-3xl shadow-xl overflow-hidden border transition-all",
        darkMode ? "glass-card border-white/10" : "bg-white border-slate-100 shadow-sm"
      )}>
        {visibleAppointments.length === 0 ? (
          <EmptyState
            darkMode={darkMode}
            icon={Calendar}
            message={
              appointments.length === 0
                ? "There is no data available"
                : dateFilter
                  ? `No appointments scheduled for ${formatDate(dateFilter)}`
                  : "No appointments match your filter"
            }
          />
        ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className={cn(
              "text-xs font-bold uppercase tracking-wider transition-colors",
              darkMode ? "bg-white/5 text-slate-400" : "bg-slate-50 border-b border-slate-100 text-slate-500"
            )}>
              <th className="px-4 md:px-8 py-3 md:py-4">Date & Time</th>
              <th className="px-4 md:px-8 py-3 md:py-4">Patient</th>
              <th className="px-4 md:px-8 py-3 md:py-4">Service</th>
              <th className="px-4 md:px-8 py-3 md:py-4">Status</th>
              <th className="px-4 md:px-8 py-3 md:py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y transition-colors", darkMode ? "divide-white/10" : "divide-slate-100")}>
            {visibleAppointments.map(appt => (
              <tr key={appt.id} className={cn("group transition-colors", darkMode ? "hover:bg-white/5" : "hover:bg-slate-50/50")}>
                <td className="px-4 md:px-8 py-4 md:py-5">
                  <p className={cn("font-bold", darkMode ? "text-white" : "text-slate-900")}>{formatDate(appt.date)}</p>
                  <p className="text-xs text-slate-500 font-bold">{appt.time}</p>
                </td>
                <td className={cn("px-4 md:px-8 py-4 md:py-5 font-bold", darkMode ? "text-white" : "text-slate-900")}>{appt.patientName}</td>
                <td className="px-4 md:px-8 py-4 md:py-5">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap",
                    darkMode ? "bg-accent-teal/10 text-accent-teal" : "bg-blue-50 text-blue-600"
                  )}>{appt.serviceType}</span>
                </td>
                <td className="px-4 md:px-8 py-4 md:py-5">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap",
                    appt.status === 'Completed'
                      ? (darkMode ? "bg-green-500/10 text-green-400" : "bg-emerald-50 text-emerald-600")
                      : (darkMode ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600")
                  )}>{appt.status}</span>
                </td>
                <td className="px-4 md:px-8 py-4 md:py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'appointments', appt.id), { status: 'Completed' });
                        } catch (error) {
                          alert(handleFirestoreError(error, OperationType.UPDATE, `appointments/${appt.id}`));
                        }
                      }}
                      className={cn("p-2 rounded-lg transition-colors", darkMode ? "hover:bg-green-500/10 text-green-400" : "hover:bg-emerald-50 text-emerald-600")}
                    >
                      <CheckCircle2 size={18} />
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await deleteDoc(doc(db, 'appointments', appt.id));
                        } catch (error) {
                          alert(handleFirestoreError(error, OperationType.DELETE, `appointments/${appt.id}`));
                        }
                      }}
                      className={cn("p-2 rounded-lg transition-colors", darkMode ? "hover:bg-red-500/10 text-red-400" : "hover:bg-red-50 text-red-600")}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAdd} className={cn(
            "rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl transition-all duration-300",
            darkMode ? "glass-card" : "bg-white"
          )}>
            <h2 className={cn("text-xl md:text-2xl font-bold", darkMode ? "text-white" : "text-slate-900")}>Schedule Appointment</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Select Patient</label>
                <select 
                  required 
                  className={cn(
                    "w-full px-4 py-3 border-none rounded-xl transition-all",
                    darkMode ? "bg-white/5 text-white border border-white/10 [&>option]:bg-slate-900" : "bg-slate-50 text-slate-900"
                  )}
                  value={newAppt.patientId} 
                  onChange={e => setNewAppt({...newAppt, patientId: e.target.value})}
                >
                  <option value="">Choose a patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Date</label>
                  <input 
                    required 
                    type="date" 
                    className={cn(
                      "w-full px-4 py-3 border-none rounded-xl transition-all",
                      darkMode ? "bg-white/5 text-white border border-white/10" : "bg-slate-50 text-slate-900"
                    )}
                    value={newAppt.date} 
                    onChange={e => setNewAppt({...newAppt, date: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Time</label>
                  <input 
                    required 
                    type="time" 
                    className={cn(
                      "w-full px-4 py-3 border-none rounded-xl transition-all",
                      darkMode ? "bg-white/5 text-white border border-white/10" : "bg-slate-50 text-slate-900"
                    )}
                    value={newAppt.time} 
                    onChange={e => setNewAppt({...newAppt, time: e.target.value})} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Service Type</label>
                <select 
                  className={cn(
                    "w-full px-4 py-3 border-none rounded-xl transition-all",
                    darkMode ? "bg-white/5 text-white border border-white/10 [&>option]:bg-slate-900" : "bg-slate-50 text-slate-900"
                  )}
                  value={newAppt.serviceType} 
                  onChange={e => setNewAppt({...newAppt, serviceType: e.target.value as ServiceType})}
                >
                  {Object.values(ServiceType).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                type="button" 
                onClick={() => setShowAdd(false)} 
                className={cn(
                  "flex-1 py-3 border rounded-xl font-bold transition-all",
                  darkMode ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100/20 hover:bg-blue-700 transition-all"
              >
                Schedule
              </button>
            </div>
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

// --- Prescriptions View ---

function PrescriptionsView({ patients, prescriptions, doctorProfile, user, darkMode }: { 
  patients: Patient[], 
  prescriptions: any[], 
  doctorProfile: any,
  user: User,
  darkMode: boolean 
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    patientEmail: '',
    medicines: [{ name: '', dosage: '', frequency: '', duration: '' }],
    instructions: ''
  });

  // Auto-dismiss message after 2 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [message.text]);

  const handleAddMedicine = () => {
    setFormData({
      ...formData,
      medicines: [...formData.medicines, { name: '', dosage: '', frequency: '', duration: '' }]
    });
  };

  const handleMedicineChange = (index: number, field: string, value: string) => {
    const newMedicines = [...formData.medicines];
    (newMedicines[index] as any)[field] = value;
    setFormData({ ...formData, medicines: newMedicines });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const doctorName = doctorProfile?.displayName || user.displayName || 'Doctor';
      const dateStr = new Date().toISOString();
      const prescriptionData = {
        patientId: formData.patientId,
        patientName: formData.patientName,
        patientEmail: formData.patientEmail,
        medicines: formData.medicines,
        instructions: formData.instructions,
        doctorName,
        date: dateStr,
      };

      // Save to Firestore
      await addDoc(collection(db, 'prescriptions'), prescriptionData);

      // Try sending email (don't fail the whole operation if email fails)
      try {
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
              <h1 style="margin: 0;">KHAN DENTAL</h1>
              <p style="margin: 4px 0 0 0; opacity: 0.8;">Medical Prescription</p>
            </div>
            <div style="padding: 24px;">
              <p><strong>Patient:</strong> ${formData.patientName}</p>
              <p><strong>Doctor:</strong> ${doctorName}</p>
              <p><strong>Date:</strong> ${formatDate(dateStr)}</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
              <h3 style="color: #1e293b;">Medicines:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">Medicine</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">Dosage</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  ${formData.medicines.map(m => `
                    <tr>
                      <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">${m.name}</td>
                      <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">${m.dosage}</td>
                      <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">${m.frequency}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ${formData.instructions ? `
                <div style="margin-top: 24px; padding: 16px; background-color: #f8fafc; border-radius: 8px;">
                  <p style="margin: 0; font-weight: bold; color: #64748b;">Instructions:</p>
                  <p style="margin: 8px 0 0 0;">${formData.instructions}</p>
                </div>
              ` : ''}
            </div>
            <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
              Thank you for choosing Khan Dental!
            </div>
          </div>
        `;
        await sendEmail(formData.patientEmail, `Prescription from Khan Dental - ${formatDate(dateStr)}`, emailHtml);
        setMessage({ type: 'success', text: 'Prescription saved and emailed successfully!' });
      } catch {
        setMessage({ type: 'success', text: 'Prescription saved! Email could not be sent.' });
      }

      setShowAddModal(false);
      setFormData({
        patientId: '',
        patientName: '',
        patientEmail: '',
        medicines: [{ name: '', dosage: '', frequency: '', duration: '' }],
        instructions: ''
      });
    } catch (error: any) {
      const msg = handleFirestoreError(error, OperationType.CREATE, 'prescriptions');
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className={cn("text-2xl md:text-4xl font-black tracking-tight", darkMode ? "text-white" : "text-slate-900")}>Prescriptions</h2>
          <p className={cn("mt-1 font-medium text-sm md:text-lg", darkMode ? "text-slate-400" : "text-slate-500")}>Write and manage patient prescriptions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 text-sm md:text-base self-start sm:self-auto"
        >
          <PlusCircle size={18} />
          <span className="hidden sm:inline">Write Prescription</span>
          <span className="sm:hidden">Prescribe</span>
        </button>
      </div>

      {message.text && (
        <div className={cn(
          "p-4 rounded-xl font-bold animate-in fade-in slide-in-from-top-2",
          message.type === 'success' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
        )}>
          {message.text}
        </div>
      )}

      {prescriptions.length === 0 ? (
        <div className={cn(
          "rounded-2xl md:rounded-3xl border overflow-hidden",
          darkMode ? "glass-card border-white/10" : "bg-white border-slate-100 shadow-sm"
        )}>
          <EmptyState darkMode={darkMode} icon={ClipboardList} />
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {prescriptions.map((p) => (
          <div key={p.id} className={cn(
            "p-6 rounded-2xl border shadow-sm transition-all hover:shadow-md",
            darkMode ? "glass-card" : "bg-white border-slate-100"
          )}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <ClipboardList size={20} />
              </div>
              <span className="text-xs font-bold text-slate-500">{formatDate(p.date)}</span>
            </div>
            <h3 className={cn("font-bold text-lg", darkMode ? "text-white" : "text-slate-900")}>{p.patientName}</h3>
            <p className="text-sm text-slate-500 mb-4">{p.patientEmail}</p>
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medicines</p>
              {p.medicines.slice(0, 2).map((m: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className={darkMode ? "text-slate-300" : "text-slate-700"}>{m.name}</span>
                  <span className="text-slate-500">{m.dosage}</span>
                </div>
              ))}
              {p.medicines.length > 2 && (
                <p className="text-xs text-blue-500 font-bold">+{p.medicines.length - 2} more</p>
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">By {p.doctorName}</span>
              <button 
                onClick={async () => {
                  try {
                    setLoading(true);
                    await sendEmail(p.patientEmail, `Re-sent Prescription from Khan Dental`, `Re-sent prescription details...`);
                    setMessage({ type: 'success', text: 'Email re-sent successfully!' });
                  } catch (err: any) {
                    setMessage({ type: 'error', text: err.message });
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Mail size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className={cn(
            "rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto transition-all duration-300",
            darkMode ? "glass-card" : "bg-white"
          )}>
            <div className={cn(
              "p-4 md:p-8 border-b flex items-center justify-between sticky top-0 z-10 transition-colors",
              darkMode ? "bg-dark-bg/80 backdrop-blur-md border-white/10" : "bg-white border-slate-100"
            )}>
              <h2 className={cn("text-xl md:text-2xl font-bold", darkMode ? "text-white" : "text-slate-900")}>Write Prescription</h2>
              <button onClick={() => setShowAddModal(false)} className={cn("p-2 rounded-full transition-colors", darkMode ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-500")}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-5 md:space-y-6">
              <div className="space-y-4">
                <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Select Patient</label>
                <select
                  required
                  className={cn(
                    "w-full px-4 py-3 border-none rounded-xl focus:ring-2 focus:ring-blue-100 transition-all",
                    darkMode ? "bg-white/5 text-white border border-white/10 [&>option]:bg-slate-900" : "bg-slate-50 text-slate-900"
                  )}
                  value={formData.patientId}
                  onChange={e => {
                    const p = patients.find(p => p.id === e.target.value);
                    if (p) {
                      setFormData({ ...formData, patientId: p.id, patientName: p.name, patientEmail: p.email });
                    }
                  }}
                >
                  <option value="">Choose a patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.email})</option>)}
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={cn("font-bold", darkMode ? "text-white" : "text-slate-900")}>Medicines</h3>
                  <button 
                    type="button"
                    onClick={handleAddMedicine}
                    className="text-blue-600 text-sm font-bold hover:underline"
                  >
                    + Add Medicine
                  </button>
                </div>
                {formData.medicines.map((m, idx) => (
                  <div key={idx} className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 md:p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                    <input 
                      placeholder="Medicine Name"
                      required
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm",
                        darkMode ? "bg-white/10 text-white" : "bg-white"
                      )}
                      value={m.name}
                      onChange={e => handleMedicineChange(idx, 'name', e.target.value)}
                    />
                    <input 
                      placeholder="Dosage"
                      required
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm",
                        darkMode ? "bg-white/10 text-white" : "bg-white"
                      )}
                      value={m.dosage}
                      onChange={e => handleMedicineChange(idx, 'dosage', e.target.value)}
                    />
                    <input 
                      placeholder="Frequency"
                      required
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm",
                        darkMode ? "bg-white/10 text-white" : "bg-white"
                      )}
                      value={m.frequency}
                      onChange={e => handleMedicineChange(idx, 'frequency', e.target.value)}
                    />
                    <input 
                      placeholder="Duration"
                      required
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm",
                        darkMode ? "bg-white/10 text-white" : "bg-white"
                      )}
                      value={m.duration}
                      onChange={e => handleMedicineChange(idx, 'duration', e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className={cn("text-sm font-bold", darkMode ? "text-slate-400" : "text-slate-700")}>Additional Instructions</label>
                <textarea 
                  rows={3}
                  className={cn(
                    "w-full px-4 py-3 border-none rounded-xl focus:ring-2 focus:ring-blue-100 transition-all",
                    darkMode ? "bg-white/5 text-white border border-white/10" : "bg-slate-50 text-slate-900"
                  )}
                  value={formData.instructions}
                  onChange={e => setFormData({...formData, instructions: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Saving & Emailing...' : 'Save & Send Prescription'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileView({ user, darkMode }: { user: User, darkMode: boolean }) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [doctorInfo, setDoctorInfo] = useState({
    specialization: '',
    licenseNo: '',
    clinicName: '',
    phone: '',
    bio: '',
    address: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showReauth, setShowReauth] = useState(false);
  const [reauthAction, setReauthAction] = useState<'password' | 'delete' | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchDoctorInfo = async () => {
      try {
        const docRef = doc(db, 'doctors', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setDoctorInfo(docSnap.data() as any);
        }
      } catch (error) {
        console.error("Error fetching doctor info:", error);
      }
    };
    fetchDoctorInfo();
  }, [user.uid]);

  // Auto-dismiss message after 2 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [message.text]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image size should be less than 1MB' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      // Update Auth Profile
      await updateProfile(user, { displayName });

      // Update Firestore Doctor Info
      await setDoc(doc(db, 'doctors', user.uid), {
        uid: user.uid,
        specialization: doctorInfo.specialization,
        licenseNo: doctorInfo.licenseNo,
        clinicName: doctorInfo.clinicName,
        phone: doctorInfo.phone,
        bio: doctorInfo.bio,
        address: doctorInfo.address,
        displayName,
        photoURL,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      const msg = getFirestoreErrorMessage(error);
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  const deleteCollectionWhere = async (name: string, field: string, value: string) => {
    const snap = await getDocs(query(collection(db, name), where(field, '==', value)));
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  };

  const purgeAccountData = async () => {
    await Promise.all([
      deleteCollectionWhere('patients', 'ownerId', user.uid).catch(() => {}),
      deleteCollectionWhere('transactions', 'ownerId', user.uid).catch(() => {}),
      deleteCollectionWhere('appointments', 'ownerId', user.uid).catch(() => {}),
      deleteCollectionWhere('prescriptions', 'ownerId', user.uid).catch(() => {}),
      deleteCollectionWhere('inventory', 'ownerId', user.uid).catch(() => {}),
    ]);
    await deleteDoc(doc(db, 'doctors', user.uid)).catch(() => {});
  };

  const handleSendVerification = async () => {
    setLoading(true);
    try {
      await sendEmailVerification(user);
      setMessage({ type: 'success', text: `Verification email sent to ${user.email}.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);

      if (reauthAction === 'password') {
        await updatePassword(user, newPassword);
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setNewPassword('');
        setConfirmPassword('');
      } else if (reauthAction === 'delete') {
        if (confirm("Are you absolutely sure? This will permanently delete your account and all associated data.")) {
          await purgeAccountData();
          await deleteUser(user);
        }
      }
      setShowReauth(false);
      setCurrentPassword('');
      setReauthAction(null);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const triggerPasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match!' });
      return;
    }
    setReauthAction('password');
    setShowReauth(true);
  };

  const triggerDeleteAccount = () => {
    setReauthAction('delete');
    setShowReauth(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className={cn("text-2xl md:text-4xl font-black tracking-tight", darkMode ? "text-white" : "text-slate-900")}>Doctor Profile</h2>
          <p className={cn("mt-1 font-medium text-sm md:text-lg", darkMode ? "text-slate-400" : "text-slate-500")}>Manage your professional identity and account security</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 font-bold text-xs md:text-sm">
            <BadgeCheck size={16} />
            Verified Professional
          </div>
          {user.emailVerified ? (
            <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold text-xs md:text-sm">
              <CheckCircle2 size={16} />
              Email Verified
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSendVerification}
              disabled={loading}
              className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 font-bold text-xs md:text-sm hover:bg-amber-500/20 transition-colors disabled:opacity-50"
            >
              <ShieldAlert size={16} />
              {loading ? "Sending..." : "Verify Email"}
            </button>
          )}
        </div>
      </div>

      {message.text && (
        <div className={cn(
          "p-4 rounded-2xl flex items-center gap-3 font-medium sticky top-4 z-20 shadow-lg backdrop-blur-md",
          message.type === 'success' 
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500" 
            : "bg-red-500/10 border border-red-500/20 text-red-500"
        )}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Avatar & Basic Info */}
          <div className="space-y-8">
            <div className={cn(
              "p-8 rounded-[2.5rem] border transition-all flex flex-col items-center text-center",
              darkMode ? "glass-card border-white/10" : "bg-white border-slate-100 shadow-sm"
            )}>
              <div className="relative group">
                <div className="w-32 h-32 rounded-[2rem] overflow-hidden border-4 border-blue-500/20 shadow-xl relative">
                  {photoURL ? (
                    <img src={photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <UserCircle size={64} />
                    </div>
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 p-3 bg-blue-600 text-white rounded-2xl shadow-lg hover:bg-blue-700 transition-all scale-90 group-hover:scale-100"
                >
                  <Camera size={20} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              <div className="mt-6">
                <h3 className={cn("text-xl font-bold", darkMode ? "text-white" : "text-slate-900")}>{displayName || 'Doctor Name'}</h3>
                <p className="text-sm font-medium text-slate-500">{user.email}</p>
              </div>
            </div>

            <div className={cn(
              "p-8 rounded-[2.5rem] border transition-all",
              darkMode ? "glass-card border-white/10" : "bg-white border-slate-100 shadow-sm"
            )}>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-600 rounded-2xl text-white">
                  <UserCircle size={24} />
                </div>
                <h3 className={cn("text-xl font-bold", darkMode ? "text-white" : "text-slate-900")}>Basic Info</h3>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className={cn("text-xs font-bold uppercase tracking-widest ml-1", darkMode ? "text-slate-500" : "text-slate-400")}>Full Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={cn(
                      "w-full px-5 py-4 rounded-2xl border outline-none transition-all font-medium",
                      darkMode ? "bg-slate-800/50 border-slate-700 text-white focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className={cn("text-xs font-bold uppercase tracking-widest ml-1", darkMode ? "text-slate-500" : "text-slate-400")}>Contact Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="tel"
                      value={doctorInfo.phone}
                      onChange={(e) => setDoctorInfo({...doctorInfo, phone: e.target.value})}
                      className={cn(
                        "w-full pl-12 pr-5 py-4 rounded-2xl border outline-none transition-all font-medium",
                        darkMode ? "bg-slate-800/50 border-slate-700 text-white focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Professional Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className={cn(
              "p-8 rounded-[2.5rem] border transition-all",
              darkMode ? "glass-card border-white/10" : "bg-white border-slate-100 shadow-sm"
            )}>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-teal-500 rounded-2xl text-white">
                  <Stethoscope size={24} />
                </div>
                <h3 className={cn("text-xl font-bold", darkMode ? "text-white" : "text-slate-900")}>Professional Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={cn("text-xs font-bold uppercase tracking-widest ml-1", darkMode ? "text-slate-500" : "text-slate-400")}>Specialization</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Orthodontist, Oral Surgeon"
                    value={doctorInfo.specialization}
                    onChange={(e) => setDoctorInfo({...doctorInfo, specialization: e.target.value})}
                    className={cn(
                      "w-full px-5 py-4 rounded-2xl border outline-none transition-all font-medium",
                      darkMode ? "bg-slate-800/50 border-slate-700 text-white focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className={cn("text-xs font-bold uppercase tracking-widest ml-1", darkMode ? "text-slate-500" : "text-slate-400")}>License Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DENT-123456"
                    value={doctorInfo.licenseNo}
                    onChange={(e) => setDoctorInfo({...doctorInfo, licenseNo: e.target.value})}
                    className={cn(
                      "w-full px-5 py-4 rounded-2xl border outline-none transition-all font-medium",
                      darkMode ? "bg-slate-800/50 border-slate-700 text-white focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className={cn("text-xs font-bold uppercase tracking-widest ml-1", darkMode ? "text-slate-500" : "text-slate-400")}>Clinic Name</label>
                  <input
                    type="text"
                    required
                    value={doctorInfo.clinicName}
                    onChange={(e) => setDoctorInfo({...doctorInfo, clinicName: e.target.value})}
                    className={cn(
                      "w-full px-5 py-4 rounded-2xl border outline-none transition-all font-medium",
                      darkMode ? "bg-slate-800/50 border-slate-700 text-white focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className={cn("text-xs font-bold uppercase tracking-widest ml-1", darkMode ? "text-slate-500" : "text-slate-400")}>Clinic Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={doctorInfo.address}
                      onChange={(e) => setDoctorInfo({...doctorInfo, address: e.target.value})}
                      className={cn(
                        "w-full pl-12 pr-5 py-4 rounded-2xl border outline-none transition-all font-medium",
                        darkMode ? "bg-slate-800/50 border-slate-700 text-white focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <label className={cn("text-xs font-bold uppercase tracking-widest ml-1", darkMode ? "text-slate-500" : "text-slate-400")}>Professional Bio</label>
                <textarea
                  rows={4}
                  value={doctorInfo.bio}
                  onChange={(e) => setDoctorInfo({...doctorInfo, bio: e.target.value})}
                  className={cn(
                    "w-full px-5 py-4 rounded-2xl border outline-none transition-all font-medium",
                    darkMode ? "bg-slate-800/50 border-slate-700 text-white focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
                  )}
                  placeholder="Tell patients about your experience and expertise..."
                />
              </div>

              <div className="mt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  {loading ? "Saving Changes..." : <><Upload size={20} /> Save Professional Profile</>}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              {/* Password Change */}
              <div className={cn(
                "p-5 md:p-8 rounded-2xl md:rounded-[2.5rem] border transition-all",
                darkMode ? "glass-card border-white/10" : "bg-white border-slate-100 shadow-sm"
              )}>
                <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                  <div className="p-2.5 md:p-3 bg-amber-500 rounded-xl md:rounded-2xl text-white">
                    <Key size={22} />
                  </div>
                  <h3 className={cn("text-lg md:text-xl font-bold", darkMode ? "text-white" : "text-slate-900")}>Security</h3>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className={cn("text-xs font-bold uppercase tracking-widest ml-1", darkMode ? "text-slate-500" : "text-slate-400")}>New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={cn(
                        "w-full px-5 py-4 rounded-2xl border outline-none transition-all font-medium",
                        darkMode ? "bg-slate-800/50 border-slate-700 text-white focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={cn("text-xs font-bold uppercase tracking-widest ml-1", darkMode ? "text-slate-500" : "text-slate-400")}>Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={cn(
                        "w-full px-5 py-4 rounded-2xl border outline-none transition-all font-medium",
                        darkMode ? "bg-slate-800/50 border-slate-700 text-white focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
                      )}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={triggerPasswordChange}
                    className="w-full bg-amber-500 text-white py-4 rounded-2xl font-bold hover:bg-amber-600 transition-all"
                  >
                    Change Password
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className={cn(
                "p-8 rounded-[2.5rem] border border-red-500/20 transition-all flex flex-col justify-between",
                darkMode ? "bg-red-500/5" : "bg-red-50"
              )}>
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-red-500 rounded-2xl text-white">
                      <UserMinus size={24} />
                    </div>
                    <h3 className={cn("text-xl font-bold", darkMode ? "text-white" : "text-slate-900")}>Danger Zone</h3>
                  </div>
                  <p className={cn("text-sm font-medium mb-6", darkMode ? "text-slate-400" : "text-slate-500")}>Permanently delete your account and all clinic data. This action cannot be undone.</p>
                </div>
                <button
                  type="button"
                  onClick={triggerDeleteAccount}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Re-authentication Modal */}
      {showReauth && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className={cn(
            "w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border transition-all animate-in zoom-in-95 duration-300",
            darkMode ? "glass-card border-white/10" : "bg-white border-slate-100"
          )}>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-500/20">
                <ShieldCheck size={32} />
              </div>
              <h3 className={cn("text-2xl font-black tracking-tight mb-2", darkMode ? "text-white" : "text-slate-900")}>Confirm Identity</h3>
              <p className={cn("text-sm font-medium", darkMode ? "text-slate-400" : "text-slate-500")}>Please enter your current password to proceed with this sensitive action</p>
            </div>

            <form onSubmit={handleReauth} className="space-y-6">
              <div className="space-y-2">
                <label className={cn("text-xs font-bold uppercase tracking-widest ml-1", darkMode ? "text-slate-500" : "text-slate-400")}>Current Password</label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={cn(
                    "w-full px-5 py-4 rounded-2xl border outline-none transition-all font-medium",
                    darkMode ? "bg-slate-800/50 border-slate-700 text-white focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
                  )}
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => { setShowReauth(false); setReauthAction(null); setCurrentPassword(''); }}
                  className={cn(
                    "flex-1 py-4 border rounded-2xl font-bold transition-all",
                    darkMode ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SheetsView({ transactions, darkMode }: { transactions: Transaction[], darkMode: boolean }) {
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(filterMonth));
  }, [transactions, filterMonth]);

  const totals = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const handlePrint = () => {
    const monthLabel = new Date(filterMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = filteredTransactions.map(t =>
      `<tr>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;">${formatDate(t.date)}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;">${t.description}<br/><span style="color:#94a3b8;font-size:12px;">${t.patientName || 'General'}</span></td>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;">${t.category}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-weight:700;color:${t.type === 'Income' ? '#22c55e' : '#ef4444'};">${t.type === 'Income' ? '+' : '-'}${formatCurrency(t.amount)}</td>
      </tr>`
    ).join('');

    printWindow.document.write(`
      <html>
      <head>
        <title>KHAN DENTAL - Financial Sheet - ${monthLabel}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 40px; color: #0f172a; }
          h1 { font-size: 24px; margin: 0; color: #2563eb; }
          .subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
          .meta { margin: 20px 0; font-size: 14px; color: #334155; }
          .summary { display: flex; gap: 24px; margin: 24px 0; }
          .summary-card { flex: 1; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; }
          .summary-card h3 { margin: 0 0 4px; font-size: 13px; font-weight: 600; }
          .summary-card p { margin: 0; font-size: 20px; font-weight: 800; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
          thead th { text-align: left; padding: 10px 16px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; }
          .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; font-style: italic; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>KHAN DENTAL</h1>
        <div class="subtitle">Professional Dental Care & Surgery</div>
        <div class="meta">Monthly Financial Sheet &mdash; <strong>${monthLabel}</strong></div>
        <div class="summary">
          <div class="summary-card" style="background:#f0fdf4;border-color:#bbf7d0;">
            <h3 style="color:#16a34a;">Income</h3>
            <p style="color:#15803d;">${formatCurrency(totals.income)}</p>
          </div>
          <div class="summary-card" style="background:#fef2f2;border-color:#fecaca;">
            <h3 style="color:#dc2626;">Expenses</h3>
            <p style="color:#b91c1c;">${formatCurrency(totals.expense)}</p>
          </div>
          <div class="summary-card" style="background:#eff6ff;border-color:#bfdbfe;">
            <h3 style="color:#2563eb;">Net Balance</h3>
            <p style="color:#1d4ed8;">${formatCurrency(totals.balance)}</p>
          </div>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
          <tbody>${rows.length > 0 ? rows : '<tr><td colspan="4" style="padding:20px;text-align:center;color:#94a3b8;">No transactions for this month</td></tr>'}</tbody>
        </table>
        <div class="footer">Generated on ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })} &bull; Khan Dental Practice Management</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={cn("text-2xl md:text-3xl font-black tracking-tight", darkMode ? "text-white" : "text-slate-900")}>Financial Sheets</h2>
          <p className={cn("mt-1 font-medium text-sm md:text-base", darkMode ? "text-slate-400" : "text-slate-500")}>Detailed cash flow and activity tracking</p>
        </div>
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <input
            type="month"
            className={cn(
              "px-3 md:px-4 py-2 border rounded-xl font-bold transition-all text-sm md:text-base",
              darkMode ? "bg-white/5 text-white border-white/10" : "bg-white border-slate-200 text-slate-900"
            )}
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
          <button className={cn(
            "p-2 border rounded-xl transition-all",
            darkMode ? "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
          )}>
            <Download size={18} />
          </button>
          <button
            onClick={handlePrint}
            className={cn(
              "flex items-center gap-2 px-3 md:px-4 py-2 border rounded-xl font-bold transition-all text-sm md:text-base",
              darkMode ? "bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30" : "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
            )}
          >
            <Printer size={18} />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
        <div className={cn(
          "p-4 md:p-6 rounded-2xl md:rounded-3xl border transition-all",
          darkMode ? "bg-green-500/10 border-green-500/20" : "bg-emerald-50 border-emerald-100"
        )}>
          <p className={cn("text-xs md:text-sm font-bold mb-1", darkMode ? "text-green-400" : "text-emerald-600")}>Monthly Income</p>
          <h3 className={cn("text-xl md:text-2xl font-black", darkMode ? "text-white" : "text-emerald-700")}>{formatCurrency(totals.income)}</h3>
        </div>
        <div className={cn(
          "p-4 md:p-6 rounded-2xl md:rounded-3xl border transition-all",
          darkMode ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-100"
        )}>
          <p className={cn("text-xs md:text-sm font-bold mb-1", darkMode ? "text-red-400" : "text-red-600")}>Monthly Expenses</p>
          <h3 className={cn("text-xl md:text-2xl font-black", darkMode ? "text-white" : "text-red-700")}>{formatCurrency(totals.expense)}</h3>
        </div>
        <div className={cn(
          "p-4 md:p-6 rounded-2xl md:rounded-3xl border transition-all",
          darkMode ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-100"
        )}>
          <p className={cn("text-xs md:text-sm font-bold mb-1", darkMode ? "text-blue-400" : "text-blue-600")}>Net Balance</p>
          <h3 className={cn("text-xl md:text-2xl font-black", darkMode ? "text-white" : "text-blue-700")}>{formatCurrency(totals.balance)}</h3>
        </div>
      </div>

      <div className={cn(
        "rounded-2xl md:rounded-3xl shadow-xl overflow-hidden border transition-all",
        darkMode ? "glass-card border-white/10" : "bg-white border-slate-100 shadow-sm"
      )}>
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className={cn(
              "text-xs font-bold uppercase tracking-wider transition-colors",
              darkMode ? "bg-white/5 text-slate-400" : "bg-slate-50 border-b border-slate-100 text-slate-500"
            )}>
              <th className="px-4 md:px-8 py-3 md:py-4">Date</th>
              <th className="px-4 md:px-8 py-3 md:py-4">Description</th>
              <th className="px-4 md:px-8 py-3 md:py-4">Category</th>
              <th className="px-4 md:px-8 py-3 md:py-4">Amount</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y transition-colors", darkMode ? "divide-white/10" : "divide-slate-100")}>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 md:px-8 py-12">
                  <div className={cn("text-center font-medium", darkMode ? "text-slate-400" : "text-slate-500")}>
                    {transactions.length === 0 ? "There is no data available" : "No transactions for this month"}
                  </div>
                </td>
              </tr>
            ) : filteredTransactions.map(t => (
              <tr key={t.id} className={cn("group transition-colors", darkMode ? "hover:bg-white/5" : "hover:bg-slate-50/50")}>
                <td className="px-4 md:px-8 py-4 md:py-5">
                  <div className={cn("font-bold whitespace-nowrap", darkMode ? "text-white" : "text-slate-900")}>{formatDate(t.date)}</div>
                </td>
                <td className="px-4 md:px-8 py-4 md:py-5">
                  <div className={cn("font-bold", darkMode ? "text-white" : "text-slate-900")}>{t.description}</div>
                  <div className={cn("text-xs", darkMode ? "text-slate-500" : "text-slate-500")}>{t.patientName || 'General'}</div>
                </td>
                <td className="px-4 md:px-8 py-4 md:py-5">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap",
                    darkMode ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-600"
                  )}>{t.category}</span>
                </td>
                <td className={cn(
                  "px-4 md:px-8 py-4 md:py-5 font-black whitespace-nowrap",
                  t.type === 'Income' ? "text-green-500" : "text-red-500"
                )}>
                  {t.type === 'Income' ? '+' : '-'}{formatCurrency(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// --- Email Service ---

async function sendEmail(to: string, subject: string, html: string) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to send email');
    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
}

// --- PDF Generation ---

function generateInvoice(patient: Patient) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text('KHAN DENTAL', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('Professional Dental Care & Surgery', 105, 28, { align: 'center' });
  
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.line(20, 35, 190, 35);
  
  // Patient Info
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('INVOICE TO:', 20, 45);
  doc.setFont('helvetica', 'bold');
  doc.text(patient.name.toUpperCase(), 20, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`Serial No: ${patient.serialNo}`, 20, 59);
  doc.text(`Date: ${formatDate(new Date())}`, 20, 66);
  
  // Table
  (doc as any).autoTable({
    startY: 75,
    head: [['Description', 'Service Type', 'Amount']],
    body: [
      [`Dental Treatment: ${patient.serviceType}`, patient.serviceType, formatCurrency(patient.amountDue)]
    ],
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 75 }
  });
  
  const finalY = (doc as any).lastAutoTable.finalY;
  
  // Summary
  doc.text('Summary:', 140, finalY + 15);
  doc.text(`Total Due: ${formatCurrency(patient.amountDue)}`, 140, finalY + 25);
  doc.text(`Paid: ${formatCurrency(patient.amountPaid)}`, 140, finalY + 32);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const balance = patient.amountDue - patient.amountPaid;
  doc.text(`Balance: ${formatCurrency(balance)}`, 140, finalY + 42);
  
  // Footer
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for choosing Khan Dental!', 105, 280, { align: 'center' });
  
  doc.save(`Invoice_${patient.serialNo}.pdf`);
}
