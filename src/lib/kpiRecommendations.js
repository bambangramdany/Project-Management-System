/**
 * Rule-based KPI recommendation engine.
 * Generates structured evaluation & development recommendations
 * based on supervisor scores, self-assessment gaps, role, and division.
 *
 * Frameworks embedded:
 *  - 70-20-10 Learning Model (Lombardo & Eichinger)
 *  - Situational Leadership (Hersey & Blanchard)
 *  - Competency Development Levels
 *  - Individual Development Plan (IDP) structure
 *  - Self-awareness / Johari Window principles
 */

// ── Score → performance level ────────────────────────────────────────────────
export function scoreLevel(score) {
  if (score == null) return null
  if (score >= 4.5) return { label: 'Luar Biasa',       color: 'emerald', rank: 5 }
  if (score >= 4.0) return { label: 'Sangat Baik',      color: 'blue',    rank: 4 }
  if (score >= 3.5) return { label: 'Baik',             color: 'teal',    rank: 3 }
  if (score >= 3.0) return { label: 'Cukup',            color: 'yellow',  rank: 2 }
  if (score >= 2.0) return { label: 'Perlu Perbaikan',  color: 'orange',  rank: 1 }
  return               { label: 'Kritis',            color: 'red',     rank: 0 }
}

// ── Per-KPI recommendation templates (by score bucket) ──────────────────────
const KPI_RECO = {
  response_communication: {
    label: 'Komunikasi & Responsivitas',
    low: {
      issue: 'Kecepatan dan kualitas respons komunikasi perlu perhatian segera.',
      actions: [
        '(On-the-job 70%) Buat komitmen: balas pesan tim maksimal 2 jam di jam kerja — lacak konsistensinya selama 30 hari.',
        '(Social 20%) Minta feedback jujur dari 2–3 rekan setiap 2 minggu: "Apakah komunikasiku cukup jelas dan cepat?"',
        '(Formal 10%) Ikuti 1 workshop atau kursus komunikasi efektif dalam 3 bulan ke depan.',
        'Gunakan template pesan standar untuk situasi berulang (update status, permintaan data, konfirmasi jadwal).',
      ],
    },
    mid: {
      issue: 'Komunikasi sudah cukup baik namun proaktivitas dan konsistensi perlu ditingkatkan.',
      actions: [
        '(On-the-job 70%) Biasakan beri update status pekerjaan sebelum diminta — minimal 1× sehari kepada atasan.',
        '(Social 20%) Minta atasan atau rekan senior untuk review cara kamu berkomunikasi dalam meeting 1 bulan ini.',
        'Latih kejelasan pesan tertulis: gunakan poin-poin singkat, bukan paragraf panjang.',
        'Sampaikan hambatan atau risiko lebih awal — jangan tunggu deadline sudah dekat.',
      ],
    },
    high: {
      issue: 'Komunikasi sudah menjadi kekuatan — saatnya jadikan multiplier untuk tim.',
      actions: [
        'Jadilah mentor komunikasi bagi rekan junior: tunjukkan contoh nyata cara berkomunikasi yang efektif.',
        'Dokumentasikan praktik terbaik komunikasi kamu sebagai bahan SOP atau onboarding tim.',
        'Ambil peran sebagai juru bicara tim dalam presentasi klien atau briefing lintas departemen.',
      ],
    },
  },

  on_time_discipline: {
    label: 'Ketepatan Waktu & Disiplin',
    low: {
      issue: 'Ketepatan waktu dan konsistensi memenuhi deadline perlu perhatian serius.',
      actions: [
        '(On-the-job 70%) Mulai gunakan task board harian (Notion/Trello/kertas) — tulis 3 prioritas utama setiap pagi.',
        'Terapkan "buffer 20%": jika kamu estimasi butuh 5 hari, commit 6 hari ke atasan.',
        '(Social 20%) Lakukan daily check-in singkat (5 menit) dengan atasan untuk pastikan prioritas selaras.',
        '(Formal 10%) Pelajari metode Eisenhower Matrix atau teknik time-blocking dalam 1 bulan ke depan.',
        'Identifikasi 3 penyebab utama keterlambatanmu dan buat rencana mitigasi spesifik untuk masing-masing.',
      ],
    },
    mid: {
      issue: 'Sebagian besar deadline terpenuhi namun perlu lebih konsisten di situasi multitasking.',
      actions: [
        '(On-the-job 70%) Terapkan time-blocking: jadwalkan waktu fokus 90 menit tanpa gangguan untuk pekerjaan prioritas.',
        'Komunikasikan potensi keterlambatan minimal 2 hari sebelum deadline — jangan tunggu hari H.',
        '(Social 20%) Review kalender mingguan bersama atasan di Senin pagi untuk sinkronisasi prioritas.',
      ],
    },
    high: {
      issue: 'Disiplin dan ketepatan waktu sudah menjadi standar yang bisa diandalkan tim.',
      actions: [
        'Bantu tim membangun sistem monitoring deadline yang lebih baik (shared calendar, status board).',
        'Berbagi tips manajemen waktu dalam forum tim setiap bulan.',
        'Pertimbangkan peran sebagai koordinator jadwal dalam project berikutnya.',
      ],
    },
  },

  work_quality: {
    label: 'Kualitas Kerja',
    low: {
      issue: 'Kualitas output belum konsisten memenuhi standar — perlu perbaikan sistematis.',
      actions: [
        '(On-the-job 70%) Buat checklist self-review personal sebelum menyerahkan setiap pekerjaan.',
        'Minta review rekan senior sebelum submit pekerjaan penting — jadikan kebiasaan, bukan pengecualian.',
        '(Social 20%) Minta feedback spesifik setelah setiap deliverable: "Apa konkretnya yang bisa lebih baik?"',
        '(Formal 10%) Pelajari standar kualitas divisi secara mendalam — minta atasan jelaskan ekspektasinya.',
        'Fokus perbaikan satu area kualitas per bulan agar progres terasa dan terukur.',
      ],
    },
    mid: {
      issue: 'Kualitas kerja sudah memenuhi standar dasar namun belum konsisten di semua kondisi.',
      actions: [
        '(On-the-job 70%) Kembangkan checklist personal untuk jenis pekerjaan yang sering kamu kerjakan.',
        '(Social 20%) Minta feedback spesifik setelah setiap deliverable besar — catat dan tindak lanjuti.',
        '(Formal 10%) Targetkan 1 skill teknis baru yang relevan dengan peran kamu per kuartal.',
      ],
    },
    high: {
      issue: 'Kualitas kerja menjadi referensi standar yang baik untuk tim.',
      actions: [
        'Dokumentasikan proses kerja terbaik kamu sebagai panduan atau template tim.',
        'Ikuti kursus atau sertifikasi lanjutan untuk terus upgrade standar kualitas.',
        'Mentori rekan yang masih berjuang dengan konsistensi kualitas output.',
      ],
    },
  },

  responsibility_initiative: {
    label: 'Tanggung Jawab & Inisiatif',
    low: {
      issue: 'Perlu lebih proaktif dan bertanggung jawab penuh terhadap lingkup pekerjaan.',
      actions: [
        '(On-the-job 70%) Latih ownership mindset: selesaikan (atau coba selesaikan) masalah sebelum melapor, bukan hanya melapor masalah.',
        'Jangan tunggu instruksi untuk hal-hal yang sudah jelas dalam lingkup tugasmu.',
        'Inisiasi satu improvement kecil per bulan di area kerjamu sendiri — no matter how small.',
        '(Social 20%) Diskusikan dengan atasan: apa definisi "inisiatif" yang diharapkan di peran ini?',
        '(Formal 10%) Baca dan pahami job description kamu secara menyeluruh — semua tanggung jawab harus terpenuhi.',
      ],
    },
    mid: {
      issue: 'Tanggung jawab terpenuhi dengan baik, namun inisiatif masih bisa lebih dikembangkan.',
      actions: [
        '(On-the-job 70%) Usulkan satu ide perbaikan proses per kuartal kepada atasan — lengkap dengan alasan dan cara implementasinya.',
        'Ambil tanggung jawab tambahan secara sukarela dalam project berikutnya.',
        '(Social 20%) Pelajari cara rekan yang sudah dikenal proaktif — apa yang mereka lakukan berbeda?',
      ],
    },
    high: {
      issue: 'Inisiatif dan rasa tanggung jawab sudah menjadi trademark kerja yang kuat.',
      actions: [
        'Arahkan energi ini untuk memimpin inisiatif tim, bukan hanya personal.',
        'Ajak rekan untuk ikut berinsiatif — jadikan budaya, bukan sifat individual.',
        'Dokumentasikan dan presentasikan hasil inisiatif ke manajemen sebagai bukti kontribusi nyata.',
      ],
    },
  },

  teamwork: {
    label: 'Kerja Tim & Kolaborasi',
    low: {
      issue: 'Kolaborasi dan kontribusi dalam dinamika tim perlu ditingkatkan secara aktif.',
      actions: [
        '(On-the-job 70%) Targetkan minimal 1 kontribusi aktif per rapat: pendapat, pertanyaan, atau ide.',
        'Tawarkan bantuan kepada rekan yang terlihat overload — tanpa harus diminta.',
        '(Social 20%) Latih mendengar aktif: pahami konteks dan kebutuhan rekan sebelum merespons.',
        '(Formal 10%) Pelajari model kolaborasi efektif: Tuckman team stages, conflict resolution dasar.',
        'Ikuti kegiatan team bonding dengan antusias — kontribusi di luar pekerjaan juga diperhatikan.',
      ],
    },
    mid: {
      issue: 'Sudah berkontribusi dengan baik dalam tim, namun kolaborasi bisa lebih dalam dan proaktif.',
      actions: [
        '(On-the-job 70%) Aktif berbagi informasi relevan ke tim tanpa perlu diminta.',
        'Inisiasi diskusi problem solving bersama tim, bukan hanya menunggu atasan yang memimpin.',
        '(Social 20%) Berikan feedback konstruktif kepada rekan — bukan hanya menerima.',
      ],
    },
    high: {
      issue: 'Kolaborasi sudah menjadi kekuatan yang terlihat nyata dalam tim.',
      actions: [
        'Ambil peran connector: bantu hubungkan orang-orang yang perlu berkolaborasi namun belum terhubung.',
        'Fasilitasi sesi knowledge sharing dalam tim secara berkala.',
        'Identifikasi rekan yang kesulitan beradaptasi dengan dinamika tim dan bantu secara personal.',
      ],
    },
  },

  team_development: {
    label: 'Pengembangan Tim (Leadership)',
    low: {
      issue: 'Sebagai pemimpin, investasi terhadap pertumbuhan anggota tim perlu lebih konsisten dan terstruktur.',
      actions: [
        '(On-the-job 70%) Jadwalkan 1-on-1 mingguan dengan setiap anggota tim (15–30 menit) — konsisten, bukan insidental.',
        'Terapkan model mentoring: jelaskan → demo → biarkan coba → beri feedback spesifik.',
        'Identifikasi 1 strength dan 1 area development untuk setiap anggota timmu.',
        '(Social 20%) Belajar dari pemimpin yang kamu kagumi — apa yang mereka lakukan untuk mengembangkan timnya?',
        '(Formal 10%) Pelajari dasar-dasar Situational Leadership (Hersey & Blanchard) — sesuaikan gaya kepemimpinan dengan kematangan anggota tim.',
      ],
    },
    mid: {
      issue: 'Sudah mulai mengembangkan tim namun pendekatan bisa lebih terstruktur dan berbasis data.',
      actions: [
        '(On-the-job 70%) Buat Individual Development Plan (IDP) sederhana untuk setiap anggota tim: 1 goal + 2-3 action.',
        'Delegasikan tugas yang memberi peluang belajar — bukan hanya yang paling mudah.',
        '(Social 20%) Rayakan progress dan pencapaian anggota tim secara eksplisit: pengakuan publik sangat berarti.',
      ],
    },
    high: {
      issue: 'Pengembangan tim sudah menjadi prioritas yang dijalankan dengan baik — arahkan ke level strategis.',
      actions: [
        'Bangun sistem succession: siapkan anggota tim yang bisa menggantikan posisimu dalam 6-12 bulan.',
        'Ciptakan budaya belajar: alokasikan waktu/budget rutin untuk pengembangan tim.',
        'Dokumentasikan framework pengembangan yang kamu terapkan agar bisa menjadi panduan bagi pemimpin lain.',
      ],
    },
  },

  decision_making: {
    label: 'Pengambilan Keputusan (Leadership)',
    low: {
      issue: 'Kecepatan dan kualitas pengambilan keputusan perlu peningkatan yang signifikan.',
      actions: [
        '(On-the-job 70%) Gunakan kerangka sederhana: kumpulkan data → identifikasi opsi → pertimbangkan risiko → putuskan → evaluasi.',
        'Latih pengambilan keputusan di situasi kecil setiap hari untuk membangun kepercayaan diri.',
        'Tetapkan deadline keputusan agar tidak terjebak analysis paralysis — "keputusan terlambat sama buruknya dengan keputusan salah."',
        '(Social 20%) Diskusikan keputusan yang sudah kamu ambil dengan mentor — refleksikan prosesnya, bukan hanya hasilnya.',
        '(Formal 10%) Pelajari Cost-Benefit Analysis sederhana dan SWOT singkat untuk keputusan yang lebih terstruktur.',
      ],
    },
    mid: {
      issue: 'Pengambilan keputusan sudah baik di situasi rutin, perlu lebih percaya diri di situasi kompleks dan ambigu.',
      actions: [
        '(On-the-job 70%) Latih diri memutuskan dengan informasi 70-80% — tidak perlu menunggu 100% sempurna.',
        'Dokumentasikan setiap keputusan besar beserta hasilnya: ini akan menjadi bank pembelajaran berharga.',
        '(Social 20%) Sebelum keputusan strategis, minta perspektif 1-2 orang terpercaya — tapi tetap kamu yang memutuskan.',
      ],
    },
    high: {
      issue: 'Kemampuan pengambilan keputusan sudah menjadi aset kepemimpinan yang kuat.',
      actions: [
        'Bagikan framework pengambilan keputusan kamu kepada tim — jadikan pembelajaran bersama.',
        'Ambil keputusan yang lebih strategis dan berdampak lebih luas secara bertahap.',
        'Bangun budaya di mana anggota tim berani dan mampu mengambil keputusan di level mereka sendiri.',
      ],
    },
  },

  delegation: {
    label: 'Pendelegasian (Leadership)',
    low: {
      issue: 'Kemampuan mendelegasikan perlu ditingkatkan — ini adalah kunci skalabilitas kepemimpinan.',
      actions: [
        '(On-the-job 70%) Identifikasi 3 tugas minggu ini yang bisa didelegasikan — lakukan sekarang.',
        'Gunakan model delegasi bertahap: brief → dampingi → lepas dengan monitoring → otonom penuh.',
        'Fokus pada hasil yang diinginkan, bukan cara — beri ruang anggota tim untuk punya pendekatan sendiri.',
        '(Social 20%) Minta feedback dari anggota tim: apakah mereka merasa mendapat cukup kepercayaan dan otonomi?',
        '(Formal 10%) Pelajari "art of delegation" — bedakan micromanagement vs healthy oversight.',
      ],
    },
    mid: {
      issue: 'Sudah mulai mendelegasikan namun ada kecenderungan overcontrol atau pilihan delegasi yang terlalu aman.',
      actions: [
        '(On-the-job 70%) Tingkatkan skala delegasi — coba delegasikan tugas yang lebih kompleks dan penting.',
        'Bedakan antara delegasi dan dump: pastikan anggota tim punya resources, brief yang jelas, dan support yang cukup.',
        '(Social 20%) Evaluasi hasil delegasi secara reguler dan jadikan bahan coaching 1-on-1.',
      ],
    },
    high: {
      issue: 'Delegasi sudah berjalan efektif — jadikan leverage untuk output tim yang jauh lebih besar.',
      actions: [
        'Delegasikan tanggung jawab yang membutuhkan judgment, bukan hanya eksekusi rutin.',
        'Ciptakan sistem accountability yang membuat delegasi terukur dan transparan bagi semua pihak.',
        'Mentori pemimpin lain tentang seni mendelegasikan dengan efektif dan penuh kepercayaan.',
      ],
    },
  },
}

// ── Gap → self-awareness insight ─────────────────────────────────────────────
function gapInsight(gap) {
  if (gap == null) return null
  if (gap >= 2) return {
    type: 'overrate',
    note: 'Nilai dirimu secara signifikan lebih tinggi dari penilaian atasanmu. Ini sinyal penting untuk meningkatkan self-awareness — mungkin ada blind spot yang belum kamu sadari.',
    action: 'Jadwalkan percakapan jujur dengan atasanmu: minta feedback konkret tentang apa yang perlu berubah secara spesifik.',
  }
  if (gap >= 1) return {
    type: 'slight-overrate',
    note: 'Ada selisih antara persepsi dirimu dan penilaian atasan. Wajar, namun perlu diperhatikan sebelum menjadi blind spot.',
    action: 'Tanyakan kepada atasan secara spesifik: di situasi mana kinerjamu di area ini terasa kurang optimal?',
  }
  if (gap <= -2) return {
    type: 'underrate',
    note: 'Atasanmu menilaimu jauh lebih tinggi dari penilaianmu sendiri — kamu memiliki potensi yang belum sepenuhnya kamu akui. Ini adalah hidden strength yang perlu dikembangkan lebih jauh.',
    action: 'Ambil lebih banyak tantangan di area ini — kamu lebih siap dan mampu dari yang kamu pikir.',
  }
  if (gap <= -1) return {
    type: 'slight-underrate',
    note: 'Atasanmu melihat nilai lebih di area ini. Ada potensi yang belum kamu yakini sepenuhnya.',
    action: 'Tingkatkan kepercayaan diri dan berani tampil lebih percaya diri di area ini.',
  }
  return {
    type: 'aligned',
    note: 'Self-assessment kamu selaras dengan penilaian atasan — tanda self-awareness yang sehat.',
    action: null,
  }
}

// ── Role & division context ───────────────────────────────────────────────────
const ROLE_CONTEXT = {
  PROJECT_MANAGER: {
    focus: 'Sebagai Project Manager, tiga core competency yang paling menentukan adalah: kepemimpinan tim, kemampuan pengambilan keputusan cepat, dan pendelegasian yang efektif. Kualitas eksekusi tim sangat bergantung pada seberapa baik kamu menjalankan tiga hal ini.',
    priority: ['team_development', 'decision_making', 'delegation'],
    nextLevel: 'Persiapan menuju level berikutnya: kembangkan kemampuan strategic planning, stakeholder management, dan kemampuan memimpin lintas divisi.',
  },
  PROJECT_OFFICER: {
    focus: 'Sebagai Project Officer, fondasi peran ada pada eksekusi yang detail, komunikasi lintas tim yang lancar, dan ketepatan waktu dalam setiap deliverable. Ini yang membuat proyek berjalan mulus di tingkat operasional.',
    priority: ['on_time_discipline', 'response_communication', 'work_quality'],
    nextLevel: 'Persiapan menuju Project Manager: mulai latih kemampuan planning, koordinasi multi-pihak, dan pengambilan keputusan di lapangan.',
  },
  STAFF: {
    focus: 'Pada fase ini, fokuslah pada penguasaan teknis peran dan membangun reputasi melalui konsistensi serta kualitas kerja. Ini adalah investasi jangka panjang yang akan membuka pintu ke level berikutnya.',
    priority: ['work_quality', 'responsibility_initiative', 'teamwork'],
    nextLevel: 'Kembangkan kemampuan mandiri, inisiatif, dan kemampuan koordinasi sebagai bekal naik ke level yang lebih senior.',
  },
  INTERNSHIP: {
    focus: 'Masa magang adalah fondasi karier. Fokuslah pada belajar sebanyak mungkin, menunjukkan inisiatif, dan membangun kebiasaan kerja profesional yang solid sejak awal.',
    priority: ['responsibility_initiative', 'response_communication', 'work_quality'],
    nextLevel: 'Tunjukkan bahwa kamu dapat diandalkan, proaktif, dan punya growth mindset — ini yang membuka peluang karier lebih lanjut.',
  },
}

const DIVISI_CONTEXT = {
  EVENT: 'Di dunia event, kemampuan bekerja di bawah tekanan tinggi, koordinasi multi-pihak secara simultan, dan adaptasi cepat terhadap perubahan mendadak adalah nilai tambah yang sangat dihargai. Konsistensi di saat kondisi lapangan tidak ideal adalah pembeda profesional sejati.',
  CREATIVE: 'Di divisi Creative, konsistensi kualitas output, kemampuan iterasi cepat berdasarkan feedback klien, dan pemahaman mendalam terhadap brief adalah differentiator utama. Kreativitas tanpa eksekusi yang disiplin tidak menghasilkan karya terbaik.',
}

// ── Main export: generate full evaluation ─────────────────────────────────────
export function generateEvaluation({ user, selfMap, supMap, kpiDefs }) {
  const scoredDefs = kpiDefs.filter(def => !def.auto && supMap[def.key] != null)

  const supValues = scoredDefs.map(d => supMap[d.key]).filter(Boolean)
  const selfValues = scoredDefs.map(d => selfMap[d.key]).filter(Boolean)
  const supAvg = supValues.length ? supValues.reduce((a, b) => a + b, 0) / supValues.length : null
  const selfAvg = selfValues.length ? selfValues.reduce((a, b) => a + b, 0) / selfValues.length : null

  const overallLevel = scoreLevel(supAvg ?? selfAvg)

  // Per-criterion analysis
  const criteriaAnalysis = scoredDefs.map(def => {
    const supScore = supMap[def.key]
    const selfScore = selfMap[def.key] ?? null
    const gap = selfScore != null ? Math.round((selfScore - supScore) * 10) / 10 : null
    const template = KPI_RECO[def.key]
    if (!template) return null

    const bucket = supScore >= 4 ? 'high' : supScore >= 3 ? 'mid' : 'low'
    const reco = template[bucket]
    const insight = gapInsight(gap)

    return {
      key: def.key,
      label: template.label,
      group: def.group,
      supScore,
      selfScore,
      gap,
      bucket,
      issue: reco.issue,
      actions: reco.actions,
      gapInsight: insight,
      isHighPriority: supScore < 3 || (gap != null && Math.abs(gap) >= 2),
    }
  }).filter(Boolean).sort((a, b) => {
    if (a.isHighPriority && !b.isHighPriority) return -1
    if (!a.isHighPriority && b.isHighPriority) return 1
    return (a.supScore ?? 0) - (b.supScore ?? 0)
  })

  const role = user.role
  const divisi = user.divisi

  const roleCtx = ROLE_CONTEXT[role] ||
    (role?.includes('MANAGER') ? ROLE_CONTEXT.PROJECT_MANAGER :
     role?.includes('INTERN')  ? ROLE_CONTEXT.INTERNSHIP : ROLE_CONTEXT.STAFF)

  const divisiCtx = DIVISI_CONTEXT[divisi] || ''

  const strengths      = criteriaAnalysis.filter(c => c.bucket === 'high')
  const priorityAreas  = criteriaAnalysis.filter(c => c.isHighPriority).slice(0, 4)
  const developAreas   = criteriaAnalysis.filter(c => c.bucket === 'mid' && !c.isHighPriority)

  return {
    overallLevel,
    supAvg,
    selfAvg,
    roleProfile: roleCtx.focus,
    divisiContext: divisiCtx,
    nextLevel: roleCtx.nextLevel,
    strengths,
    priorityAreas,
    developAreas,
    criteriaAnalysis,
    hasSelf: selfValues.length > 0,
    hasSup: supValues.length > 0,
  }
}
