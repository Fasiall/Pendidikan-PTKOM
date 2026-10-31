/* ==========================================================================
   script.js — Kuis Petualangan Ceria (sisi klien / frontend)

   Frontend ini memanggil backend REST API (Express + PostgreSQL):
     GET  /api/questions             -> daftar soal (tanpa kunci jawaban)
     POST /api/quiz/start            -> mulai sesi kuis
     POST /api/quiz/answer           -> kirim jawaban (divalidasi server)
     POST /api/quiz/submit           -> simpan skor akhir
     POST /api/auth/login            -> login guru, menerima token JWT
     POST /api/auth/register         -> daftar akun baru
     GET  /api/teacher/stats         -> dashboard admin (header Bearer)
     GET  /api/materials             -> daftar materi belajar (halaman materi.html)

   Susunan file:
   (1)  Referensi elemen DOM
   (2)  Status / variabel global
   (3)  Helper API + notifikasi (toast)
   (4)  Navigasi antar halaman
   (5)  Hiasan: judul meloncat + dekorasi latar
   (6)  Logika kuis (render soal, jawaban, lanjut)
   (7)  Animasi: konfeti, flash layar, skor berjalan
   (8)  Halaman hasil (bintang + pesan motivasi)
   (9)  Login & dashboard guru
   (10) Registrasi & login guru
   (11) Inisialisasi program
   ========================================================================== */

/* =============== (1) REFERENSI ELEMEN DOM ============================== */
const $ = (sel) => document.querySelector(sel);

const decorLayer    = $("#decorLayer");
const confettiLayer = $("#confettiLayer");
const fxFlash       = $("#fxFlash");
const fxEmoji       = $("#fxEmoji");
const toastBox      = $("#toast");

const questionCard  = $("#questionCard");
const progressFill  = $("#progressFill");
const progressText  = $("#progressText");
const scoreChip     = $("#scoreChip");
const qSubject      = $("#qSubject");
const qImage        = $("#qImage");
const qText         = $("#qText");
const answersBox    = $("#answers");
const feedbackBox   = $("#feedback");
const btnNext       = $("#btnNext");

const starRow       = $("#starRow");
const scoreNumber   = $("#scoreNumber");
const scoreTotal    = $("#scoreTotal");
const resultEmoji   = $("#resultEmoji");
const resultTitle   = $("#resultTitle");
const motivationBox = $("#motivation");

const loginForm     = $("#loginForm");
const usernameInput = $("#username");
const passwordInput = $("#password");
const togglePass    = $("#togglePass");
const loginError    = $("#loginError");

const registerForm  = $("#registerForm");
const regUsernameInput = $("#regUsername");
const regEmailInput = $("#regEmail");
const regPasswordInput = $("#regPassword");
const regConfirmPasswordInput = $("#regConfirmPassword");
const regTogglePass   = $("#toggleRegPass");
const registerError   = $("#registerError");

const questionList  = $("#questionList");
const resultsList   = $("#resultsList");
const statMaterials = $("#statMaterials");
const statTotal     = $("#statTotal");
const statTopics    = $("#statTopics");
const statAvgScore = $("#statAvgScore");

/* Elemen form admin (kelola materi & soal) */
const materiForm      = $("#materiForm");
const materiFormTitle = $("#materiFormTitle");
const materiError     = $("#materiError");
const mTitle          = $("#mTitle");
const mSummary        = $("#mSummary");
const mSubject        = $("#mSubject");
const mEmoji          = $("#mEmoji");
const mImage          = $("#mImage");
const mContent        = $("#mContent");
const mPublish        = $("#mPublish");
const btnCancelMateri = $("#btnCancelMateri");
const materiAdminList = $("#materiAdminList");
const materiCount     = $("#materiCount");

const soalForm      = $("#soalForm");
const soalFormTitle = $("#soalFormTitle");
const soalError     = $("#soalError");
const qQuestion     = $("#qQuestion");
const adEmoji       = $("#adEmoji");
const adSubject     = $("#adSubject");
const qMaterial     = $("#qMaterial");
const qFact         = $("#qFact");
const qSet          = $("#qSet");
const btnCancelSoal = $("#btnCancelSoal");
const soalAdminList = $("#soalAdminList");
const soalCount     = $("#soalCount");

/* Input Pilihan Jawaban Visual (A-D) */
const optInput0          = $("#optInput0");
const optInput1          = $("#optInput1");
const optInput2          = $("#optInput2");
const optInput3          = $("#optInput3");
const optionsCreatorList = $("#optionsCreatorList");

/* Panel Atur Soal & Kunci Jawaban Kuis */
const quizQuestionsManager = $("#quizQuestionsManager");
const mgrSetTitle          = $("#mgrSetTitle");
const mgrSetMeta           = $("#mgrSetMeta");
const btnMgrAddQuestion    = $("#btnMgrAddQuestion");
const btnMgrClose          = $("#btnMgrClose");
const mgrQuestionsList     = $("#mgrQuestionsList");

/* Elemen form admin set soal */
const setForm       = $("#setForm");
const setFormTitle  = $("#setFormTitle");
const setError      = $("#setError");
const sSetMaterial  = $("#sSetMaterial");
const sSetTitle     = $("#sSetTitle");
const sSetDesc      = $("#sSetDesc");
const sSetTime      = $("#sSetTime");
const sSetPublish   = $("#sSetPublish");
const btnCancelSet  = $("#btnCancelSet");
const setAdminList  = $("#setAdminList");
const setCount      = $("#setCount");