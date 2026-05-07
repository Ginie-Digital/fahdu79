require 'xcodeproj'

project_path = 'ios/Fahdu.xcodeproj'
project = Xcodeproj::Project.open(project_path)

target = project.targets.find { |t| t.name == 'Fahdu' }
group = project.main_group['Fahdu']

# Add BootSplash.storyboard
file_name = 'BootSplash.storyboard'
file_ref = group.files.find { |f| f.path == file_name }

unless file_ref
  puts "Adding #{file_name} to group..."
  file_ref = group.new_file("Fahdu/#{file_name}")
end

resources_phase = target.resources_build_phase
existing = resources_phase.files.find { |f| f.file_ref == file_ref }
unless existing
  puts "Adding #{file_name} to Resources build phase..."
  resources_phase.add_file_reference(file_ref)
end

project.save
puts "Done."
