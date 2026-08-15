/**
 * Locale data. This file is imported by BOTH server and client components, so
 * it must stay free of next/headers and any other server-only import.
 * Reading the cookie lives in lib/locale.ts.
 */

export type Locale = 'ar' | 'en';

export const LOCALES: Locale[] = ['ar', 'en'];
export const DEFAULT_LOCALE: Locale = 'ar';
export const LOCALE_COOKIE = 'course_platform_locale';

export function isLocale(value: unknown): value is Locale {
  return value === 'ar' || value === 'en';
}

export function isRtl(locale: Locale): boolean {
  return locale === 'ar';
}

/** BCP-47 tag for Intl. `nu-latn` keeps Latin digits in Arabic. */
export function intlTag(locale: Locale): string {
  return locale === 'ar' ? 'ar-KW-u-nu-latn' : 'en-GB';
}

const en = {
  dir: 'ltr',
  localeName: 'English',
  otherLocaleName: 'العربية',
  meta: {
    title: 'Course Booking',
    description: 'Browse online courses and book a time slot.'
  },
  common: {
    appName: 'Course Booking',
    save: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    close: 'Close',
    edit: 'Edit',
    delete: 'Delete',
    deleting: 'Deleting…',
    remove: 'Remove',
    removing: 'Removing…',
    add: 'Add',
    adding: 'Adding…',
    creating: 'Creating…',
    working: 'Working…',
    when: 'When',
    course: 'Course',
    student: 'Student',
    status: 'Status',
    reference: 'Reference',
    minutes: 'min',
    language: 'Language'
  },
  nav: {
    dashboard: 'Dashboard',
    courses: 'Courses',
    availability: 'Availability',
    bookings: 'Bookings',
    myBookings: 'My bookings',
    password: 'Password',
    signOut: 'Sign out'
  },
  auth: {
    welcomeBack: 'Welcome back',
    welcomeBackSub: 'Sign in to book a course session.',
    createAccount: 'Create your account',
    createAccountSub: 'Then pick a course and a time that suits you.',
    email: 'Email',
    password: 'Password',
    fullName: 'Full name',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    creatingAccount: 'Creating account…',
    createAccountBtn: 'Create account',
    noAccount: 'No account yet?',
    createOne: 'Create one',
    alreadyRegistered: 'Already registered?',
    minChars: 'At least 8 characters.'
  },
  account: {
    setPassword: 'Set your password',
    changePassword: 'Change your password',
    signedInAs: 'Signed in as',
    forcedNotice: 'You are using a temporary password. Choose a new one to continue.',
    currentPassword: 'Current password',
    newPassword: 'New password',
    repeatPassword: 'Repeat new password',
    savePassword: 'Save new password',
    signsYouOut: 'Saving signs you out everywhere else.'
  },
  courses: {
    title: 'Available courses',
    subtitle: 'Pick a course to see open times.',
    emptyTitle: 'No courses published yet',
    emptyBody: 'Check back shortly — new sessions are added regularly.',
    timesOpen: 'times open',
    noTimesYet: 'No times yet',
    minuteSession: 'minute session',
    allCourses: 'All courses',
    chooseTime: 'Choose a time',
    chooseTimeHint: 'Highlighted days have open slots. Select one to see the times.'
  },
  calendar: {
    /** 0 = Sunday, 1 = Monday. */
    weekStart: 1,
    /** Always Sunday-first; rotated by weekStart at render. */
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    noTimesTitle: 'No times available yet',
    noTimesBody: 'There are no open slots for this course right now. Check back soon.',
    timesOn: 'Times on',
    available: 'available',
    nothingOpen: 'Nothing open on this day.',
    bookedByYou: 'Booked by you',
    fullyBooked: 'Fully booked',
    seatsLeft: 'left',
    of: 'of',
    bookThisTime: 'Book this time',
    booking: 'Booking…',
    timesAvailable: 'time(s) available',
    noTimes: 'no times'
  },
  bookings: {
    title: 'My bookings',
    subtitle: 'Your upcoming and past sessions.',
    bookSession: 'Book a session',
    emptyTitle: 'Nothing booked yet',
    emptyBody: 'Browse the courses and pick a time that works for you.',
    seeCourses: 'See courses',
    upcoming: 'Upcoming',
    noUpcoming: 'No upcoming sessions.',
    pastAndCancelled: 'Past and cancelled',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    completed: 'Completed',
    cancelBtn: 'Cancel',
    cancelling: 'Cancelling…',
    confirmCancel: 'Cancel this booking? The time slot will be released.'
  },
  admin: {
    dashboard: 'Dashboard',
    coursesStat: 'Courses',
    publishedStat: 'published',
    upcomingSlots: 'Upcoming slots',
    registeredStudents: 'registered students',
    confirmedBookings: 'Confirmed bookings',
    allTime: 'All time',
    nextSessions: 'Next sessions',
    allBookings: 'All bookings',
    noBookingsTitle: 'Nothing booked yet',
    noBookingsBody: 'Publish a course and add availability, then students can start booking.',
    manageCourses: 'Manage courses',
    setAvailability: 'Set availability',
    coursesTitle: 'Courses',
    coursesSubtitle: 'Only published courses appear to students.',
    addCourse: 'Add a course',
    newCourse: 'New course',
    courseTitle: 'Course title',
    shortSummary: 'Short summary',
    summaryPlaceholder: 'One line students see in the course list',
    fullDescription: 'Full description',
    sessionLength: 'Session length (minutes)',
    publishedLabel: 'Published — students can see and book this',
    createCourse: 'Create course',
    saveChanges: 'Save changes',
    published: 'Published',
    draft: 'Draft',
    confirmedBooking: 'confirmed booking',
    confirmedBookingPlural: 'confirmed bookings',
    confirmDeleteCourse: 'Delete this course? This cannot be undone.',
    noCoursesTitle: 'No courses yet',
    noCoursesBody: 'Create your first course, then open Availability to add teaching times.',
    availabilityTitle: 'Availability',
    timezoneNote: 'Times are entered and shown in',
    addAvailability: 'Add availability',
    date: 'Date',
    seats: 'Seats',
    seatsHint: '1 for one-to-one sessions.',
    starts: 'Starts',
    ends: 'Ends',
    anyCourse: 'Any published course',
    anyCourseTag: 'Any course',
    anyCourseHint: 'Leave as "Any" and this time shows up for every published course.',
    note: 'Note (optional)',
    notePlaceholder: 'Shown to students',
    addSlot: 'Add time slot',
    upcomingSlotsTitle: 'Upcoming slots',
    scheduled: 'scheduled',
    noSlotsTitle: 'Nothing scheduled',
    noSlotsBody: 'Add a time slot above and students will see it on the course calendar.',
    booked: 'Booked',
    bookingsTitle: 'Bookings',
    bookingsSubtitle: 'Most recent 200 bookings.',
    noBookingsYet: 'No bookings yet',
    noBookingsYetBody: 'They will appear here as soon as students start booking.'
  },
  notFound: {
    title: 'Page not found',
    body: 'That page does not exist or you no longer have access to it.',
    cta: 'Go to your dashboard'
  },
  errors: {
    sessionExpired: 'Your session has expired. Sign in again.',
    noAccess: 'You do not have access to this action.',
    setPasswordFirst: 'Set a new password before continuing.',
    badCredentials: 'That email and password combination is not recognised.',
    tooManyAttempts: 'Too many attempts. Try again in',
    tooManySignups: 'Too many sign-up attempts. Try again in',
    seconds: 's.',
    emailExists: 'An account with this email already exists.',
    registerFailed: 'Something went wrong creating your account. Try again.',
    genericFailure: 'Something went wrong. Try again.',
    notCurrentPassword: 'That is not your current password.',
    courseHasBookings: 'This course has {n} confirmed booking(s). Unpublish it instead of deleting it.',
    slotHasBookings: '{n} student(s) booked this slot. Cancel their bookings first.',
    slotOverlap: 'That overlaps an existing slot on {when}.',
    slotInPast: 'That time is in the past.',
    courseGone: 'That course no longer exists.',
    slotGone: 'That time slot no longer exists.',
    slotUnavailable: 'That time slot is no longer available.',
    slotStarted: 'That time slot has already started.',
    courseNotOpen: 'That course is not open for booking.',
    slotReservedOther: 'That time slot is reserved for a different course.',
    alreadyBooked: 'You have already booked this time slot.',
    slotFull: 'That time slot just filled up. Pick another one.',
    bookingFailed: 'Something went wrong booking that slot. Try again.',
    bookingGone: 'That booking no longer exists.',
    notYourBooking: 'That booking does not belong to you.',
    unknownCourse: 'Unknown course.',
    unknownSlot: 'Unknown time slot.',
    unknownBooking: 'Unknown booking.',
    unknownRecord: 'Unknown record.'
  },
  success: {
    created: 'Created "{name}".',
    saved: 'Saved "{name}".',
    deleted: 'Deleted "{name}".',
    slotAdded: 'Added {when}.',
    slotRemoved: 'Time slot removed.',
    booked: 'Booked {course} for {when}. Reference {ref}.',
    bookingCancelled: 'Cancelled booking {ref}.',
    alreadyCancelled: 'That booking was already cancelled.'
  },
  validation: {
    enterValidEmail: 'Enter a valid email address.',
    emailTooLong: 'That email address is too long.',
    passwordMin: 'Use at least 8 characters.',
    passwordTooLong: 'That password is too long.',
    enterName: 'Enter your name.',
    nameTooLong: 'That name is too long.',
    enterEmail: 'Enter your email address.',
    enterPassword: 'Enter your password.',
    enterCurrentPassword: 'Enter your current password.',
    repeatNewPassword: 'Repeat the new password.',
    passwordsDoNotMatch: 'The two passwords do not match.',
    differentPassword: 'Choose a password different from your current one.',
    courseTitleRequired: 'Give the course a title.',
    summaryTooLong: 'Keep the summary under 200 characters.',
    durationWhole: 'Duration must be a whole number of minutes.',
    durationMin: 'Minimum duration is 15 minutes.',
    durationMax: 'Maximum duration is 8 hours.',
    pickDate: 'Pick a date.',
    pickStart: 'Pick a start time.',
    pickEnd: 'Pick an end time.',
    endAfterStart: 'The end time must be after the start time.',
    capacityMin: 'Capacity must be at least 1.',
    capacityMax: 'Capacity cannot exceed 100.',
    notesTooLong: 'Keep your note under 500 characters.',
    tooLong: 'That value is too long.'
  }
};

export type Dictionary = typeof en;

const ar: Dictionary = {
  dir: 'rtl',
  localeName: 'العربية',
  otherLocaleName: 'English',
  meta: {
    title: 'حجز الدورات',
    description: 'تصفح الدورات المتاحة عبر الإنترنت واحجز موعدك.'
  },
  common: {
    appName: 'حجز الدورات',
    save: 'حفظ',
    saving: 'جارٍ الحفظ…',
    cancel: 'إلغاء',
    close: 'إغلاق',
    edit: 'تعديل',
    delete: 'حذف',
    deleting: 'جارٍ الحذف…',
    remove: 'إزالة',
    removing: 'جارٍ الإزالة…',
    add: 'إضافة',
    adding: 'جارٍ الإضافة…',
    creating: 'جارٍ الإنشاء…',
    working: 'جارٍ التنفيذ…',
    when: 'الموعد',
    course: 'الدورة',
    student: 'الطالب',
    status: 'الحالة',
    reference: 'الرقم المرجعي',
    minutes: 'دقيقة',
    language: 'اللغة'
  },
  nav: {
    dashboard: 'لوحة التحكم',
    courses: 'الدورات',
    availability: 'الأوقات المتاحة',
    bookings: 'الحجوزات',
    myBookings: 'حجوزاتي',
    password: 'كلمة المرور',
    signOut: 'تسجيل الخروج'
  },
  auth: {
    welcomeBack: 'مرحبًا بعودتك',
    welcomeBackSub: 'سجّل الدخول لحجز موعد في إحدى الدورات.',
    createAccount: 'إنشاء حساب جديد',
    createAccountSub: 'ثم اختر الدورة والموعد المناسب لك.',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    fullName: 'الاسم الكامل',
    signIn: 'تسجيل الدخول',
    signingIn: 'جارٍ تسجيل الدخول…',
    creatingAccount: 'جارٍ إنشاء الحساب…',
    createAccountBtn: 'إنشاء الحساب',
    noAccount: 'ليس لديك حساب؟',
    createOne: 'أنشئ حسابًا',
    alreadyRegistered: 'لديك حساب بالفعل؟',
    minChars: '٨ أحرف على الأقل.'
  },
  account: {
    setPassword: 'تعيين كلمة المرور',
    changePassword: 'تغيير كلمة المرور',
    signedInAs: 'تم تسجيل الدخول باسم',
    forcedNotice: 'أنت تستخدم كلمة مرور مؤقتة. اختر كلمة مرور جديدة للمتابعة.',
    currentPassword: 'كلمة المرور الحالية',
    newPassword: 'كلمة المرور الجديدة',
    repeatPassword: 'تأكيد كلمة المرور الجديدة',
    savePassword: 'حفظ كلمة المرور',
    signsYouOut: 'سيؤدي الحفظ إلى تسجيل خروجك من جميع الأجهزة الأخرى.'
  },
  courses: {
    title: 'الدورات المتاحة',
    subtitle: 'اختر دورة لعرض الأوقات المتاحة.',
    emptyTitle: 'لا توجد دورات منشورة بعد',
    emptyBody: 'عد لاحقًا — تُضاف مواعيد جديدة بانتظام.',
    timesOpen: 'موعد متاح',
    noTimesYet: 'لا توجد مواعيد',
    minuteSession: 'دقيقة للجلسة',
    allCourses: 'كل الدورات',
    chooseTime: 'اختر الموعد',
    chooseTimeHint: 'الأيام المميّزة تحتوي على مواعيد متاحة. اختر يومًا لعرض الأوقات.'
  },
  calendar: {
    weekStart: 0,
    days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    months: [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ],
    prevMonth: 'الشهر السابق',
    nextMonth: 'الشهر التالي',
    noTimesTitle: 'لا توجد مواعيد متاحة',
    noTimesBody: 'لا توجد مواعيد مفتوحة لهذه الدورة حاليًا. عد قريبًا.',
    timesOn: 'مواعيد يوم',
    available: 'متاح',
    nothingOpen: 'لا توجد مواعيد في هذا اليوم.',
    bookedByYou: 'محجوز باسمك',
    fullyBooked: 'مكتمل العدد',
    seatsLeft: 'متبقٍ',
    of: 'من',
    bookThisTime: 'احجز هذا الموعد',
    booking: 'جارٍ الحجز…',
    timesAvailable: 'موعد متاح',
    noTimes: 'لا توجد مواعيد'
  },
  bookings: {
    title: 'حجوزاتي',
    subtitle: 'جلساتك القادمة والسابقة.',
    bookSession: 'احجز جلسة',
    emptyTitle: 'لا توجد حجوزات بعد',
    emptyBody: 'تصفح الدورات واختر الموعد المناسب لك.',
    seeCourses: 'عرض الدورات',
    upcoming: 'القادمة',
    noUpcoming: 'لا توجد جلسات قادمة.',
    pastAndCancelled: 'السابقة والملغاة',
    confirmed: 'مؤكد',
    cancelled: 'ملغى',
    completed: 'منتهية',
    cancelBtn: 'إلغاء',
    cancelling: 'جارٍ الإلغاء…',
    confirmCancel: 'هل تريد إلغاء هذا الحجز؟ سيتم تحرير الموعد.'
  },
  admin: {
    dashboard: 'لوحة التحكم',
    coursesStat: 'الدورات',
    publishedStat: 'منشورة',
    upcomingSlots: 'المواعيد القادمة',
    registeredStudents: 'طالب مسجّل',
    confirmedBookings: 'الحجوزات المؤكدة',
    allTime: 'الإجمالي',
    nextSessions: 'الجلسات القادمة',
    allBookings: 'كل الحجوزات',
    noBookingsTitle: 'لا توجد حجوزات بعد',
    noBookingsBody: 'انشر دورة وأضف أوقاتًا متاحة، عندها يمكن للطلاب البدء بالحجز.',
    manageCourses: 'إدارة الدورات',
    setAvailability: 'تحديد الأوقات',
    coursesTitle: 'الدورات',
    coursesSubtitle: 'الدورات المنشورة فقط تظهر للطلاب.',
    addCourse: 'إضافة دورة',
    newCourse: 'دورة جديدة',
    courseTitle: 'عنوان الدورة',
    shortSummary: 'وصف مختصر',
    summaryPlaceholder: 'سطر واحد يظهر للطلاب في قائمة الدورات',
    fullDescription: 'الوصف الكامل',
    sessionLength: 'مدة الجلسة (بالدقائق)',
    publishedLabel: 'منشورة — يمكن للطلاب رؤيتها وحجزها',
    createCourse: 'إنشاء الدورة',
    saveChanges: 'حفظ التغييرات',
    published: 'منشورة',
    draft: 'مسودة',
    confirmedBooking: 'حجز مؤكد',
    confirmedBookingPlural: 'حجز مؤكد',
    confirmDeleteCourse: 'هل تريد حذف هذه الدورة؟ لا يمكن التراجع عن هذا الإجراء.',
    noCoursesTitle: 'لا توجد دورات بعد',
    noCoursesBody: 'أنشئ دورتك الأولى، ثم افتح "الأوقات المتاحة" لإضافة مواعيد التدريس.',
    availabilityTitle: 'الأوقات المتاحة',
    timezoneNote: 'تُدخل الأوقات وتُعرض بتوقيت',
    addAvailability: 'إضافة وقت متاح',
    date: 'التاريخ',
    seats: 'عدد المقاعد',
    seatsHint: '١ للجلسات الفردية.',
    starts: 'من',
    ends: 'إلى',
    anyCourse: 'أي دورة منشورة',
    anyCourseTag: 'أي دورة',
    anyCourseHint: 'اتركه على "أي دورة" ليظهر هذا الموعد في جميع الدورات المنشورة.',
    note: 'ملاحظة (اختياري)',
    notePlaceholder: 'تظهر للطلاب',
    addSlot: 'إضافة الموعد',
    upcomingSlotsTitle: 'المواعيد القادمة',
    scheduled: 'موعد مجدول',
    noSlotsTitle: 'لا توجد مواعيد مجدولة',
    noSlotsBody: 'أضف موعدًا أعلاه وسيظهر للطلاب في تقويم الدورة.',
    booked: 'المحجوز',
    bookingsTitle: 'الحجوزات',
    bookingsSubtitle: 'أحدث ٢٠٠ حجز.',
    noBookingsYet: 'لا توجد حجوزات بعد',
    noBookingsYetBody: 'ستظهر هنا فور بدء الطلاب بالحجز.'
  },
  notFound: {
    title: 'الصفحة غير موجودة',
    body: 'هذه الصفحة غير موجودة أو لم يعد لديك صلاحية الوصول إليها.',
    cta: 'الذهاب إلى لوحة التحكم'
  },
  errors: {
    sessionExpired: 'انتهت جلستك. سجّل الدخول مرة أخرى.',
    noAccess: 'ليست لديك صلاحية لتنفيذ هذا الإجراء.',
    setPasswordFirst: 'عيّن كلمة مرور جديدة قبل المتابعة.',
    badCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    tooManyAttempts: 'محاولات كثيرة جدًا. حاول مرة أخرى بعد',
    tooManySignups: 'محاولات تسجيل كثيرة جدًا. حاول مرة أخرى بعد',
    seconds: ' ثانية.',
    emailExists: 'يوجد حساب مسجّل بهذا البريد الإلكتروني.',
    registerFailed: 'تعذّر إنشاء الحساب. حاول مرة أخرى.',
    genericFailure: 'حدث خطأ ما. حاول مرة أخرى.',
    notCurrentPassword: 'كلمة المرور الحالية غير صحيحة.',
    courseHasBookings: 'هذه الدورة لديها {n} حجز مؤكد. ألغِ نشرها بدلًا من حذفها.',
    slotHasBookings: 'حجز {n} من الطلاب هذا الموعد. ألغِ حجوزاتهم أولًا.',
    slotOverlap: 'هذا الموعد يتعارض مع موعد قائم في {when}.',
    slotInPast: 'هذا الوقت في الماضي.',
    courseGone: 'لم تعد هذه الدورة موجودة.',
    slotGone: 'لم يعد هذا الموعد موجودًا.',
    slotUnavailable: 'لم يعد هذا الموعد متاحًا.',
    slotStarted: 'بدأ هذا الموعد بالفعل.',
    courseNotOpen: 'هذه الدورة غير متاحة للحجز.',
    slotReservedOther: 'هذا الموعد محجوز لدورة أخرى.',
    alreadyBooked: 'لقد حجزت هذا الموعد بالفعل.',
    slotFull: 'اكتمل هذا الموعد للتو. اختر موعدًا آخر.',
    bookingFailed: 'تعذّر حجز هذا الموعد. حاول مرة أخرى.',
    bookingGone: 'لم يعد هذا الحجز موجودًا.',
    notYourBooking: 'هذا الحجز لا يخصّك.',
    unknownCourse: 'دورة غير معروفة.',
    unknownSlot: 'موعد غير معروف.',
    unknownBooking: 'حجز غير معروف.',
    unknownRecord: 'سجل غير معروف.'
  },
  success: {
    created: 'تم إنشاء "{name}".',
    saved: 'تم حفظ "{name}".',
    deleted: 'تم حذف "{name}".',
    slotAdded: 'تمت إضافة {when}.',
    slotRemoved: 'تمت إزالة الموعد.',
    booked: 'تم حجز {course} في {when}. الرقم المرجعي {ref}.',
    bookingCancelled: 'تم إلغاء الحجز {ref}.',
    alreadyCancelled: 'هذا الحجز ملغى بالفعل.'
  },
  validation: {
    enterValidEmail: 'أدخل بريدًا إلكترونيًا صحيحًا.',
    emailTooLong: 'البريد الإلكتروني طويل جدًا.',
    passwordMin: 'استخدم ٨ أحرف على الأقل.',
    passwordTooLong: 'كلمة المرور طويلة جدًا.',
    enterName: 'أدخل اسمك.',
    nameTooLong: 'الاسم طويل جدًا.',
    enterEmail: 'أدخل بريدك الإلكتروني.',
    enterPassword: 'أدخل كلمة المرور.',
    enterCurrentPassword: 'أدخل كلمة المرور الحالية.',
    repeatNewPassword: 'أعد إدخال كلمة المرور الجديدة.',
    passwordsDoNotMatch: 'كلمتا المرور غير متطابقتين.',
    differentPassword: 'اختر كلمة مرور مختلفة عن الحالية.',
    courseTitleRequired: 'أدخل عنوان الدورة.',
    summaryTooLong: 'اجعل الوصف المختصر أقل من ٢٠٠ حرف.',
    durationWhole: 'يجب أن تكون المدة عددًا صحيحًا من الدقائق.',
    durationMin: 'أقل مدة هي ١٥ دقيقة.',
    durationMax: 'أقصى مدة هي ٨ ساعات.',
    pickDate: 'اختر التاريخ.',
    pickStart: 'اختر وقت البداية.',
    pickEnd: 'اختر وقت النهاية.',
    endAfterStart: 'يجب أن يكون وقت النهاية بعد وقت البداية.',
    capacityMin: 'يجب أن يكون عدد المقاعد ١ على الأقل.',
    capacityMax: 'لا يمكن أن يتجاوز عدد المقاعد ١٠٠.',
    notesTooLong: 'اجعل الملاحظة أقل من ٥٠٠ حرف.',
    tooLong: 'هذه القيمة طويلة جدًا.'
  }
};

const dictionaries: Record<Locale, Dictionary> = { ar, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/** Fill {placeholders} in a dictionary string. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in values ? String(values[key]) : `{${key}}`
  );
}

/** Day-of-week labels rotated so index 0 is the locale's first weekday. */
export function orderedWeekdays(d: Dictionary): string[] {
  const start = d.calendar.weekStart;
  return [...d.calendar.days.slice(start), ...d.calendar.days.slice(0, start)];
}
