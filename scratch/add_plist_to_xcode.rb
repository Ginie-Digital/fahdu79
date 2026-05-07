require 'xcodeproj'

project_path = 'ios/Fahdu.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# 1. Find the main target
target = project.targets.find { |t| t.name == 'Fahdu' }

unless target
  puts "Target 'Fahdu' not found"
  exit 1
end

# 2. Find the main group
# We look for a group named 'Fahdu'
group = project.main_group['Fahdu']

unless group
  puts "Group 'Fahdu' not found, using main_group"
  group = project.main_group
end

# 3. Check if file already exists in the group
file_name = 'GoogleService-Info.plist'
file_ref = group.files.find { |f| f.path == file_name || f.name == file_name }

unless file_ref
  puts "Adding file reference to group..."
  file_ref = group.new_file("Fahdu/#{file_name}")
end

# 4. Add to Resources build phase if not already there
resources_phase = target.resources_build_phase
existing_build_file = resources_phase.files.find { |f| f.file_ref == file_ref }

unless existing_build_file
  puts "Adding file to Resources build phase..."
  resources_phase.add_file_reference(file_ref)
end

project.save
puts "Successfully added #{file_name} to Xcode project."
