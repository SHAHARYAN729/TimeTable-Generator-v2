# At the very top of CMakeLists.txt
if(NOT DEFINED CMAKE_TOOLCHAIN_FILE)
  set(CMAKE_TOOLCHAIN_FILE "D:\MyCrowProject\server\vcpkg\scripts\buildsystems\vcpkg.cmake" CACHE STRING "")
endif()

cmake_minimum_required(VERSION 3.15)
project(MyCrowProject)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)

# Define the executable
add_executable(MyCrowProject src/main.cpp)

# Find packages
find_package(asio REQUIRED)
find_package(Crow CONFIG REQUIRED)

# Link Crow
target_link_libraries(MyCrowProject PRIVATE Crow::Crow)
# target_link_libraries(MyCrowProject PRIVATE ws2_32)