 2026 19:53:17 GMT


❌  (ios/Pods/Sentry/Sources/SentryCrash/Recording/Monitors/SentryCrashMonitor_CPPException.cpp:60:13)

  58 | static bool g_captureNextStackTrace = false;
  59 | 
> 60 | static std::terminate_handler g_originalTerminateHandler;
     |             ^ no type named 'terminate_handler' in namespace
  61 | 
  62 | static char g_eventID[37];
  63 | 
Wed, 25 Feb 2026 19:53:17 GMT


❌  (ios/Pods/Sentry/Sources/SentryCrash/Recording/Monitors/SentryCrashMonitor_CPPException.cpp:207:47)

  205 | 
  206 |             sentrycrashid_generate(g_eventID);
> 207 |             g_originalTerminateHandler = std::set_terminate(CPPExceptionTerminate);
      |                                               ^ no member named 'set_terminate' in namespace 'std'
  208 |         } else {
  209 |             std::set_terminate(g_originalTerminateHandler);
  210 |             g_originalTerminateHandler = NULL;
Wed, 25 Feb 2026 19:53:17 GMT


❌  (ios/Pods/Sentry/Sources/SentryCrash/Recording/Monitors/SentryCrashMonitor_CPPException.cpp:209:18)

  207 |             g_originalTerminateHandler = std::set_terminate(CPPExceptionTerminate);
  208 |         } else {
> 209 |             std::set_terminate(g_originalTerminateHandler);
      |                  ^ no type named 'set_terminate' in namespace 'std'
  210 |             g_originalTerminateHandler = NULL;
  211 |         }
  212 |         g_captureNextStackTrace = isEnabled;
Wed, 25 Feb 2026 19:53:17 GMT

› Compiling Pods/Sentry » SentryBacktrace.cpp
Wed, 25 Feb 2026 19:53:17 GMT

    Run script build phase 'Start Packager' will be run during every build because it does not specify any outputs. To address this issue, either add output dependencies to the script phase, or configure it to run in every build by unchecking "Based on dependency analysis" in the script phase. (in target 'AucaradasEncomendas' from project 'AucaradasEncomendas')
Wed, 25 Feb 2026 19:53:17 GMT

    Run script build phase 'Bundle React Native code and images' will be run during every build because it does not specify any outputs. To address this issue, either add output dependencies to the script phase, or configure it to run in every build by unchecking "Based on dependency analysis" in the script phase. (in target 'AucaradasEncomendas' from project 'AucaradasEncomendas')
Wed, 25 Feb 2026 19:53:17 GMT

    Run script build phase '[CP-User] Generate app.manifest for expo-updates' will be run during every build because it does not specify any outputs. To address this issue, either add output dependencies to the script phase, or configure it to run in every build by unchecking "Based on dependency analysis" in the script phase. (in target 'EXUpdates' from project 'Pods')
Wed, 25 Feb 2026 19:53:17 GMT

    Run script build phase '[CP-User] Generate app.config for prebuilt Constants.manifest' will be run during every build because it does not specify any outputs. To address this issue, either add output dependencies to the script phase, or configure it to run in every build by unchecking "Based on dependency analysis" in the script phase. (in target 'EXConstants' from project 'Pods')
Wed, 25 Feb 2026 19:53:17 GMT

▸ ** ARCHIVE FAILED **
Wed, 25 Feb 2026 19:53:17 GMT

▸ The following build commands failed:
Wed, 25 Feb 2026 19:53:17 GMT

▸ 	CompileC /Users/expo/Library/Developer/Xcode/DerivedData/AucaradasEncomendas-dseyjrkehbrswbesxunkdgswdbum/Build/Intermediates.noindex/ArchiveIntermediates/AucaradasEncomendas/IntermediateBuildFilesPath/Pods.build/Release-iphoneos/Sentry.build/Objects-normal/arm64/SentryCrashMonitor_CPPException.o /Users/expo/workingdir/build/ios/Pods/Sentry/Sources/SentryCrash/Recording/Monitors/SentryCrashMonitor_CPPException.cpp normal arm64 c++ com.apple.compilers.llvm.clang.1_0.compiler (in target 'Sentry' from project 'Pods')
Wed, 25 Feb 2026 19:53:17 GMT

▸ 	Archiving workspace AucaradasEncomendas with scheme AucaradasEncomendas
Wed, 25 Feb 2026 19:53:17 GMT

▸ (2 failures)
Wed, 25 Feb 2026 19:53:17 GMT

** ARCHIVE FAILED **
Wed, 25 Feb 2026 19:53:17 GMT

Wed, 25 Feb 2026 19:53:17 GMT

Wed, 25 Feb 2026 19:53:17 GMT

The following build commands failed:
Wed, 25 Feb 2026 19:53:17 GMT

	CompileC /Users/expo/Library/Developer/Xcode/DerivedData/AucaradasEncomendas-dseyjrkehbrswbesxunkdgswdbum/Build/Intermediates.noindex/ArchiveIntermediates/AucaradasEncomendas/IntermediateBuildFilesPath/Pods.build/Release-iphoneos/Sentry.build/Objects-normal/arm64/SentryCrashMonitor_CPPException.o /Users/expo/workingdir/build/ios/Pods/Sentry/Sources/SentryCrash/Recording/Monitors/SentryCrashMonitor_CPPException.cpp normal arm64 c++ com.apple.compilers.llvm.clang.1_0.compiler (in target 'Sentry' from project 'Pods')
Wed, 25 Feb 2026 19:53:17 GMT

	Archiving workspace AucaradasEncomendas with scheme AucaradasEncomendas
Wed, 25 Feb 2026 19:53:17 GMT

(2 failures)
Wed, 25 Feb 2026 19:53:17 GMT

Exit status: 65
Wed, 25 Feb 2026 19:53:17 GMT

Wed, 25 Feb 2026 19:53:17 GMT

+---------------------------------------+
Wed, 25 Feb 2026 19:53:17 GMT

|           Build environment           |
Wed, 25 Feb 2026 19:53:17 GMT

+-------------+-------------------------+
Wed, 25 Feb 2026 19:53:17 GMT

| xcode_path  | /Applications/Xcode.app |
Wed, 25 Feb 2026 19:53:17 GMT

| gym_version | 2.226.0                 |
Wed, 25 Feb 2026 19:53:17 GMT

| sdk         | iPhoneOS18.2.sdk        |
Wed, 25 Feb 2026 19:53:17 GMT

+-------------+-------------------------+
Wed, 25 Feb 2026 19:53:17 GMT

Looks like fastlane ran into a build/archive error with your project
Wed, 25 Feb 2026 19:53:17 GMT

It's hard to tell what's causing the error, so we wrote some guides on how
Wed, 25 Feb 2026 19:53:17 GMT

to troubleshoot build and signing issues: https://docs.fastlane.tools/codesigning/getting-started/
Wed, 25 Feb 2026 19:53:17 GMT

Before submitting an issue on GitHub, please follow the guide above and make
Wed, 25 Feb 2026 19:53:17 GMT

sure your project is set up correctly.
Wed, 25 Feb 2026 19:53:17 GMT

fastlane uses `xcodebuild` commands to generate your binary, you can see the
Wed, 25 Feb 2026 19:53:17 GMT

the full commands printed out in yellow in the above log.
Wed, 25 Feb 2026 19:53:17 GMT

Make sure to inspect the output above, as usually you'll find more error information there
Wed, 25 Feb 2026 19:53:17 GMT

[stderr] 

[!] Error building the application - see the log above
Wed, 25 Feb 2026 19:53:17 GMT

Error: The "Run fastlane" step failed because of an error in the Xcode build process. We automatically detected following errors in your Xcode build logs:
- no type named 'terminate_handler' in namespace 'std'
- no member named 'set_terminate' in namespace 'std'
- no type named 'set_terminate' in namespace 'std'
Refer to "Xcode Logs" below for additional, more detailed logs.
Clean up credentials

1s


Fail job

1s


Wed, 25 Feb 2026 19:53:22 GMT

Build failed: The "Run fastlane" step failed because of an error in the Xcode build process. We automatically detected following errors in your Xcode build logs:
- no type named 'terminate_handler' in namespace 'std'
- no member named 'set_terminate' in namespace 'std'
- no type named 'set_terminate' in namespace 'std'
Refer to "Xcode Logs" below for additional, more detailed logs.