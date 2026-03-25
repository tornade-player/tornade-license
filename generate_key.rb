#!/usr/bin/env ruby
# generate_key.rb — Generate a valid Tornade license key locally (admin use)
# Usage: ruby generate_key.rb

require "openssl"
require "securerandom"

# Load TORNADE_LICENSE_SECRET from .env.local
env_file = File.join(__dir__, ".env.local")
abort "Error: .env.local not found" unless File.exist?(env_file)

secret = nil
File.readlines(env_file).each do |line|
  match = line.strip.match(/^TORNADE_LICENSE_SECRET=(.+)$/)
  secret = match[1] if match
end
abort "Error: TORNADE_LICENSE_SECRET not found in .env.local" unless secret

# Generate 3 random 8-char hex segments
seg1 = SecureRandom.bytes(4).unpack1("H*").upcase
seg2 = SecureRandom.bytes(4).unpack1("H*").upcase
seg3 = SecureRandom.bytes(4).unpack1("H*").upcase

payload  = "#{seg1}-#{seg2}-#{seg3}"
checksum = OpenSSL::HMAC.hexdigest("SHA256", secret, payload)[0, 4].upcase

key = "TORNADE-#{payload}-#{checksum}"
puts key
