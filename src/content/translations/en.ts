/**
 * English pack — the canonical key set. All other packs are
 * Partial<Record<TranslationKey, string>> and fall back to these values.
 */
export const en = {
  reviewStatus: 'prototype-reviewed',
  strings: {
    // Brand
    tagline: 'Learn. Chant. Understand.',
    welcomeIntro:
      "Namaste! I'm Mitra. Let's learn beautiful slokas together — one small step at a time.",
    prototypeNote:
      'Sloka Steps is an early learning prototype. Everything stays on this device.',

    // Navigation and primary actions
    startLearning: 'Start Learning',
    parentArea: 'Parent Area',
    learningPath: 'Learning Path',
    settings: 'Settings',
    privacyTitle: 'Privacy',
    continueAction: 'Continue',
    next: 'Next',
    back: 'Back',
    start: 'Start',
    resume: 'Resume',
    skip: 'Skip',
    cancel: 'Cancel',
    save: 'Save',
    goHome: 'Go Home',
    chooseLanguage: 'Choose language',
    learn: 'Learn',
    practice: 'Practice',
    rewards: 'Rewards',
    slokas: 'Slokas',
    stories: 'Stories',
    search: 'Search',
    bookmarks: 'Bookmarks',

    // Audio controls
    listen: 'Listen',
    replay: 'Replay',
    stop: 'Stop',
    pauseAudio: 'Pause',
    resumeAudio: 'Resume',
    slowPlay: 'Play Slowly',
    record: 'Record',
    stopRecording: 'Stop Recording',
    playRecording: 'Play My Recording',
    deleteRecording: 'Delete and Try Again',
    recordingLabel: 'Recording… {seconds}s',
    recordedOk: 'You recorded your chant!',
    recordingHint: 'Press Record, then chant the line out loud.',

    // Exercise actions
    tryAgain: 'Try Again',
    checkAnswer: 'Check Answer',
    clearAnswer: 'Clear',

    // Lesson flow
    lessonComplete: 'Lesson Complete!',
    practiceAgain: 'Practice Again',
    stepOf: 'Step {current} of {total}',
    lessonProgress: 'Lesson progress',
    exitLesson: 'Exit lesson',
    exitConfirmTitle: 'Leave this lesson?',
    exitConfirmBody: 'Your place is saved. You can come back anytime.',
    stay: 'Keep Learning',
    leave: 'Leave Lesson',
    introReady: "Let's learn together!",
    introHint: 'Listen first, then chant along. Mitra is with you!',
    listenInstruction: 'Listen to the line. Play it as many times as you like.',
    repeatInstruction: 'Your turn! Chant the line out loud.',
    meaningIntro: 'What does it mean?',
    matchInstruction: 'Tap a phrase, then tap its meaning.',
    matchedLabel: 'Matched',
    fillBlankInstruction: 'Choose the missing word.',
    arrangeInstruction: 'Tap the words in the right order.',
    yourAnswer: 'Your answer',
    wordBank: 'Word bank',
    addWord: 'Add {word}',
    removeWord: 'Remove {word}',
    fullChantTitle: 'Chant the whole sloka!',
    fullChantInstruction: 'Listen to the full sloka, then record your chant.',
    finishLesson: 'Finish Lesson',
    listenFull: 'Listen to the Full Sloka',

    // Feedback
    correctFeedback: "That's right! Well done!",
    incorrectFeedback: 'Not quite. Take a breath and try again!',
    feedbackGreatEffort: 'Great effort!',
    feedbackNiceChanting: 'Nice chanting!',
    feedbackTryOnceMore: 'Try it once more slowly.',
    feedbackListenedCarefully: 'You listened carefully and gave it a try!',
    chantCoachSimulatedNotice:
      'This is a simulated preview. Chant Coach did not listen to or check this recording.',
    chantCoachUnavailableNotice: 'Chant Coach could not check this recording yet.',

    // Chant Coach (on-device analyzer, internal-testing stage)
    chantCoachTitle: 'Chant Coach',
    chantCoachIntro:
      'Chant one line at a time with your coach. Listen first, then chant it back — just like learning beside a teacher.',
    chantCoachChecking: 'Listening carefully…',
    chantCoachNoSpeechNotice:
      "I couldn't hear you that time. Let's move a little closer and chant out loud!",
    chantCoachTooShortNotice:
      'That was very quick! Take a breath and chant the whole line.',
    chantCoachAudioUnclearNotice:
      "I couldn't hear that clearly. Let's find a quiet spot and try once more.",
    chantCoachDifferentTextNotice:
      'That sounded like a different chant. Listen to this line once more, then try again.',
    chantCoachSummaryLovely: 'Lovely chanting! Every sound I heard matched.',
    chantCoachSummaryPractice:
      "So close! Let's listen once more and practice these sounds: {sounds}",
    chantCoachSummaryTryClearer:
      'Good try! Chant a little louder and slower so I can hear every sound.',
    chantCoachDimCompleteness: 'Heard {covered} of {expected} syllables of the line.',
    chantCoachDimPronunciation:
      '{matched} of the {assessed} clearly-heard syllables matched the text.',
    chantCoachMatchedLegend: 'Matched',
    chantCoachPracticeLegend: 'Practice',
    chantCoachUnclearLegend: 'Not sure',
    chantCoachProvenanceNote:
      'Checked against the sloka text on this device. Nothing was uploaded.',
    chantCoachTestingBadge: 'Coach preview — in family testing',
    chantCoachTestingExplainer:
      'The chant check is new and still being tested by families. It compares sounds with the sloka text — it is not a teacher, and being unsure is normal.',
    chantCoachPreparing: 'Getting your coach ready… {percent}%',
    chantCoachPreparingHint:
      'This one-time download is large (about 220 MB). Please stay connected.',
    chantCoachReady: 'Your coach is ready!',
    chantCoachNotDownloaded: 'The coach voice model is not downloaded yet.',
    chantCoachDownloadAction: 'Prepare Chant Coach',
    chantCoachFailed:
      'The coach could not start on this device. You can keep practicing — recordings are never blocked.',
    chantCoachAssetsMissing:
      'Chant Coach is not set up on this installation. Practice works normally without it.',
    chantCoachDisabledNote:
      'Chant Coach is off. A parent can turn it on in Settings.',
    chantCoachYourTurn: 'Your turn! Chant this line.',
    chantCoachListenFirst: 'Listen to the line first.',
    chantCoachTryLineAgain: 'Practice This Line Again',
    chantCoachNextLine: 'Next Line',
    chantCoachPreviousLine: 'Previous Line',
    chantCoachOpenAction: 'Practice with Chant Coach',
    chantCoachLineOf: 'Line {current} of {total}',
    chantCoachAllDone:
      'You practiced every line with your coach. Beautiful work!',
    chantCoachParentToggleLabel: 'On-device chant check (testing preview)',
    chantCoachParentToggleHelp:
      'Checks recordings against the sloka text on this device only — audio never leaves the device. New and under family testing; feedback is gentle and can be unsure. Turning this on downloads a large (~220 MB) model file once.',
    chantCoachStatusLabel: 'Chant check',

    // Chant Test (self-referenced graded test that gates the lesson)
    chantTestTitle: 'Chant Test',
    chantTestListenFirst: 'Listen to the whole sloka first.',
    chantTestSetReferenceTitle: 'Record your reference chant',
    chantTestSetReferenceHelp:
      'Record your best version of the whole sloka. This becomes your reference — later you are graded on how closely you match it. It stays on this device only.',
    chantTestReferenceSaved:
      'Reference saved! From now on, chanting this sloka is graded against your own reference.',
    chantTestReferenceSaveFailed:
      "That recording couldn't be saved as a reference. Chant a little louder and try again.",
    chantTestTakeTitle: 'Chant the whole sloka to take the test',
    chantTestTakeHelp:
      'You are graded on how closely you match your own reference chant. You can retry as many times as you like.',
    chantTestGrading: 'Scoring your chant…',
    chantTestMatch: 'Match with your reference: {percent}%',
    chantTestPassed: 'You passed the Chant Test!',
    chantTestFailedTitle: 'Not quite yet',
    chantTestFailedBody:
      'Listen to your reference again, then chant once more. You need a closer match to pass.',
    chantTestTooQuiet:
      "I couldn't hear you clearly. Move a little closer and chant out loud.",
    chantTestTooShort: 'That was very short. Chant the whole sloka.',
    chantTestUndecodable:
      "That recording couldn't be read. Let's try recording again.",
    chantTestRecord: 'Record my chant',
    chantTestRecordReference: 'Record my reference',
    chantTestRetry: 'Try Again',
    chantTestReRecordReference: 'Re-record my reference',
    chantTestPlayReference: 'Play my reference',
    chantTestGradeExcellent: 'Excellent!',
    chantTestGradeGreat: 'Great!',
    chantTestGradeGood: 'Good!',
    chantTestGradeKeepPractising: 'Keep practising',
    chantTestFinishGated: 'Pass the Chant Test to finish',
    chantTestReferenceExists: 'Your reference chant is saved.',
    chantTestMicOffNote:
      'Microphone practice is off, so this lesson is not graded. You can still finish.',

    // Audio and microphone messages
    speechUnavailable:
      'The practice voice is not available in this browser. You can still read the line and continue.',
    playbackError:
      'The sound could not play right now. You can read the line and continue.',
    micErrorFriendly:
      'We could not use the microphone. Ask a grown-up to check the browser permission. You can still continue the lesson.',
    micUnsupported:
      'Recording is not available in this browser. You can still chant out loud and continue.',
    voiceNote:
      'The practice voice is a simple computer voice, not a Sanskrit teacher.',

    // Setup
    setupTitle: 'Set up your learner',
    firstStep: 'First step',
    chooseAppLanguage: 'Which language should Sloka Steps use?',
    languageSetupHelp:
      'This sets the app, meanings, and narration. A parent can separate narration later.',
    setupIntro: 'Tell Mitra a little about the learner. No account needed!',
    nameLabel: 'What should we call you?',
    nameHelp: 'A nickname is perfect. You can leave this empty too.',
    ageLabel: 'Age range',
    ageRequired: 'Please choose an age range.',
    languageLabel: 'Learning language',
    dailyGoalLabel: 'Daily goal',
    minutesOption: '{n} minutes',
    saveProfile: 'Start My Journey',

    // Learning path
    pathTitle: 'Your Learning Path',
    stateLocked: 'Locked. Finish the previous lesson to unlock.',
    stateAvailable: 'Ready to start',
    stateInProgress: 'In progress',
    stateCompleted: 'Completed',
    stateComingSoon: 'Coming soon',
    lessonNumber: 'Lesson {n}',
    percentComplete: '{percent}% complete',
    bestStarsLabel: 'Best: {stars} of 3 stars',
    xpLabel: 'XP',
    streakLabel: 'day streak',
    minutesToday: '{done} of {goal} minutes today',
    goalReached: 'Daily goal reached! Wonderful!',
    dailyGoal: 'Daily Goal',

    // Sloka overview
    themeLabel: 'Theme',
    meaningTitle: 'What it means',
    culturalNoteTitle: 'Cultural note',
    activitiesCount: '{count} activities',
    estimatedMinutesLabel: 'About {min} minutes',
    badgeReward: 'Badge to earn: {name}',
    comingSoonBody: 'Full lesson coming in the next content update.',
    lockedMessage: 'Finish the previous lesson to unlock this one.',
    previewAudio: 'Hear a Preview',
    devanagariLabel: 'Sanskrit',
    transliterationLabel: 'Say it like this',
    regionalScriptFallback:
      'Regional-script version is being reviewed. Roman transliteration is shown for now.',

    // Completion
    starsEarned: 'You earned {stars} of 3 stars',
    xpEarned: '+{xp} XP',
    noNewXp: 'Great practice! XP is earned the first time you finish a lesson.',
    badgeUnlocked: 'Badge unlocked!',
    returnToPath: 'Return to Learning Path',
    nextLessonLabel: 'Next up',
    currentStreak: '{days}-day streak',
    wellDone: 'Well done, {name}!',

    // Parent area
    parentGateTitle: 'Grown-ups only',
    parentGateHint: 'Answer this question to open the Parent Area.',
    parentGateQuestion: 'What is {a} + {b}?',
    parentGateAnswerLabel: 'Your answer',
    parentGateWrong: "That's not right. Please try again.",
    enter: 'Enter',
    parentDashboardTitle: 'Parent Dashboard',
    childNameLabel: 'Child name',
    ageRangeLabel: 'Age range',
    preferredLanguageLabel: 'Preferred language',
    lessonsCompleted: 'Lessons completed',
    totalXpLabel: 'Total XP',
    badgesLabel: 'Badges',
    practiceHistoryTitle: 'Practice history',
    historyFirstCompletion: 'First completion',
    historyPractice: 'Practice',
    noHistory: 'No practice sessions yet.',
    lastPracticed: 'Most recently practiced',
    updateSettings: 'Update Settings',
    translationNotice:
      'Language translations in this prototype are drafts and still need review by qualified reviewers. Missing translations fall back to English.',
    audioPrivacyNotice:
      'Voice recordings stay on this device, are kept only for the current browser session, and are never uploaded.',
    resetProgress: 'Reset Progress',
    resetConfirmTitle: 'Reset all progress?',
    resetConfirmBody:
      'This removes the child profile, lesson progress, stars, XP, badges, streak, and practice history stored in this browser. It cannot be undone.',
    resetAction: 'Yes, Reset Everything',
    resetFailed:
      'Sloka Steps could not remove the saved data from this browser. Nothing was reset. Please check browser storage permissions and try again.',
    gateNotSecurityNote:
      'This simple question only deters young children. It is not a security feature.',

    // Settings
    settingsTitle: 'Settings',
    displayLanguageLabel: 'Display language',
    narrationLanguageLabel: 'Narration language',
    linkNarrationLabel: 'Use the display language for narration',
    scriptPreferenceLabel: 'Sloka script',
    scriptRegional: 'Regional script',
    scriptDevanagari: 'Devanagari',
    scriptRoman: 'Roman transliteration',
    scriptRegionalAndRoman: 'Regional script and transliteration',
    calmModeLabel: 'Calm mode',
    calmModeHelp: 'Uses fewer distractions, softer effects, and no confetti.',
    microphoneLabel: 'Allow microphone practice',
    cloudEvaluationLabel: 'Allow future cloud chant evaluation',
    retainRecordingsLabel: 'Retain practice recordings',
    communityPreferenceLabel: 'Allow future community features',
    comingFutureUpdate: 'Coming in a future update',
    reducedMotionLabel: 'Reduce animations',
    reducedMotionHelp: 'Calms movement across the app.',
    settingsSaved: 'Saved!',
    settingsSaving: 'Saving…',
    settingsSaveFailed:
      'Changes work for this session, but this browser could not save them.',

    // Privacy page
    privacyHeading: 'Your family’s privacy',
    privacyLocal:
      'Sloka Steps is a local prototype. Your profile and progress are stored only in this browser on this device.',
    privacyNoAccount:
      'There are no accounts, no ads, no analytics, and no social features. We never ask for an email, phone number, or birth date.',
    privacyAudio:
      'Voice recordings are used only for instant playback. They stay in memory for the current session, are never saved to disk, and are never uploaded anywhere.',
    privacyMicrophone:
      'The microphone is used only after you press the Record button, and you can always skip recording.',
    privacyReview:
      'This prototype has not had a formal legal or privacy review. One would be required before any production release.',

    // Errors and empty states
    errorTitle: 'Something went wrong',
    errorBody: 'Please try again. Your progress is saved on this device.',
    reload: 'Reload',
    missingContentTitle: 'Hmm, we could not find that.',
    missingContentBody: "Let's head back to the learning path and keep going!",
    notFoundTitle: 'Oops! Page not found',
    notFoundBody: "Mitra couldn't find that page. Let's get back to learning!",

    // Misc
    defaultLearnerName: 'Learner',
    mitraAlt: 'Mitra, your friendly lotus guide',
    skipToContent: 'Skip to content',
    starsAria: '{stars} of 3 stars',
    closeDialog: 'Close',
  },
} as const

export type TranslationKey = keyof typeof en.strings
