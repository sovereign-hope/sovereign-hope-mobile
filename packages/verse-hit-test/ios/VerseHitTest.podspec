Pod::Spec.new do |s|
  s.name           = 'VerseHitTest'
  s.version        = '1.0.0'
  s.summary        = 'Native text-run hit testing for verse selection'
  s.description    = 'Expo module that performs native Core Text hit testing to find which Bible verse is at a given screen coordinate.'
  s.author         = 'Sovereign Hope'
  s.homepage       = 'https://github.com/sovereign-hope/sovereign-hope-mobile'
  s.license        = 'MIT'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'React-Core'
  s.dependency 'React-RCTFabric'
  s.dependency 'React-Fabric'

  s.source_files = '**/*.{h,m,mm,swift}'
  s.swift_version = '5.9'

  s.pod_target_xcconfig = {
    'HEADER_SEARCH_PATHS' => [
      '"$(PODS_ROOT)/Headers/Private/Yoga"',
      '"$(PODS_ROOT)/Headers/Private/React-Core"',
      '"$(PODS_ROOT)/React-Fabric"',
      '"$(PODS_ROOT)/React-Fabric/react/renderer/components/view/platform/cxx"',
      '"$(PODS_ROOT)/React-graphics"',
      '"$(PODS_ROOT)/React-graphics/react/renderer/graphics/platform/ios"',
      '"$(PODS_ROOT)/ReactCommon"',
      '"$(PODS_ROOT)/ReactCommon/react/nativemodule/core"',
    ].join(' ')
  }
end
