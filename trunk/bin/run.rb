#!/usr/bin/env ruby

BINPATH = File.expand_path(File.dirname(__FILE__))

system("#{File.join(BINPATH,'launch.rb')} run #{ARGV.join(' ')}")

