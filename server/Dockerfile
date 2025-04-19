# Start from a C++ base image
FROM mcr.microsoft.com/vscode/devcontainers/cpp:ubuntu-22.04

# Install required build tools and libraries
RUN apt-get update && apt-get install -y git curl zip unzip ninja-build python3 python3-pip

# Install openpyxl Python package
RUN pip3 install openpyxl

# Set working directory inside the container
WORKDIR /app

# Copy project files (assumes this includes CMakeLists.txt and src/)
COPY . .

# Clone vcpkg
RUN git clone https://github.com/microsoft/vcpkg.git

# Bootstrap vcpkg
RUN ./vcpkg/bootstrap-vcpkg.sh

# Install dependencies (Crow and Asio) using vcpkg
RUN ./vcpkg/vcpkg install crow asio

# Set vcpkg environment variables
ENV VCPKG_ROOT=/app/vcpkg
ENV CMAKE_TOOLCHAIN_FILE=/app/vcpkg/scripts/buildsystems/vcpkg.cmake

# Create a build directory
RUN mkdir build
WORKDIR /app/build

# Configure the project with vcpkg toolchain
RUN cmake .. -DCMAKE_TOOLCHAIN_FILE=${CMAKE_TOOLCHAIN_FILE} -DCMAKE_BUILD_TYPE=Release

# Build the executable
RUN cmake --build . --config Release

# Expose the port your Crow app listens on
EXPOSE 3000

# Run the compiled executable
CMD ["./MyCrowProject"]