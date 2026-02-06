.PHONY: local.dev local.build local.install local.clean local.link local.test

# Run the TUI in development mode
local.dev:
	npm run dev

# Build TypeScript to dist/
local.build:
	npm run build

# Install dependencies
local.install:
	npm install

# Clean build artifacts
local.clean:
	rm -rf dist node_modules

# Link globally so `swanson` command works anywhere
local.link: local.build
	npm link

# Run tests (when we have them)
local.test:
	npm test

# Default target
all: local.install local.build
