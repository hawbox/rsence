
Gem::Specification.new do |s|
  s.name      = 'rsence'
  s.authors   = [ 'Riassence Inc.', 'Juha-Jarmo Heinonen' ]
  s.email     = 'info@rsence.org'
  s.version   = File.read('VERSION')
  s.date      = Time.now
  s.homepage  = 'http://www.rsence.org/'
  s.rubyforge_project = 'rsence-'
  s.license   = 'MIT'
  prerelease  = s.version.to_s.end_with?('.pre')
  s.name      = 'rsence-pre' if prerelease
  normalized_version = s.version.to_s.to_f
  # release .pre -versions a separate rsence-pre gem since 2.1
  if normalized_version >= 2.1 and prerelease
    s.version = s.version.to_s[0..-5]
  end
  s.summary   = "#{'Pre-' if prerelease}Release #{normalized_version} version of RSence."
  # deprecated in rubygems 1.8:
  # s.has_rdoc  = 'yard'
  s.description = File.read('README.rdoc').split('== Introduction')[1].split('== Installing RSence')[0].strip
  s.add_dependency( "rsence-deps", "971" )
  require 'rake'
  s.files = FileList[
    'lib/**/*',
    'setup/welcome/**/*',
    'conf/default_conf.yaml',
    'conf/default_strings.yaml',
    'conf/rsence_command_strings.yaml',
    'plugins/client_pkg/**/*',
    'plugins/index_html/**/*',
    'plugins/main/**/*',
    'plugins/ticket/**/*',
    'client/**/*',
    'README.rdoc',
    'INSTALL.rdoc',
    'AUTHORS.txt',
    'MIT-LICENSE.txt',
    'docs/*.rdoc',
    'VERSION'
  ].to_a
  s.files.reject! { |fn| fn.start_with? "." }
  s.files.reject! { |fn| fn.end_with? ".rbc" }
  s.files.push '.yardopts'
  if prerelease
    s.files.push 'bin/rsence-pre'
    s.executables = [ 'rsence-pre' ]
    # deprecated in rubygems 1.8:
    # s.default_executable = 'rsence-pre'
  else
    s.executables = [ 'rsence' ]
    # deprecated in rubygems 1.8:
    # s.default_executable = 'rsence'
  end
  s.required_ruby_version = '>= 1.8.7'
end

