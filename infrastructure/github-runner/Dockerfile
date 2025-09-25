# GitHub Actions Self-Hosted Runner for BIGSIRFLRTS
# Optimized for speed with local caching and pre-installed dependencies

FROM ubuntu:22.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install prerequisites and development tools
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    jq \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3 \
    python3-venv \
    python3-dev \
    python3-pip \
    sudo \
    ripgrep \
    shellcheck \
    ca-certificates \
    gnupg \
    lsb-release \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

# Install Docker CLI (for Docker-in-Docker if needed)
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright dependencies (for browser testing)
RUN npx -y playwright install-deps chromium

# Create runner user
RUN useradd -m -s /bin/bash runner \
    && usermod -aG sudo runner \
    && echo "runner ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set up runner directory
WORKDIR /home/runner

# Download and extract GitHub Actions runner
ENV RUNNER_VERSION=2.320.0
RUN curl -o actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz -L https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz \
    && tar xzf ./actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz \
    && rm actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz \
    && chown -R runner:runner /home/runner

# Install runner dependencies
RUN ./bin/installdependencies.sh

# Cache npm packages globally to speed up builds
ENV NPM_CONFIG_CACHE=/home/runner/.npm-cache
RUN mkdir -p /home/runner/.npm-cache && chown -R runner:runner /home/runner/.npm-cache

# Switch to runner user
USER runner

# Copy startup script
COPY --chown=runner:runner start-runner.sh /home/runner/start-runner.sh
RUN chmod +x /home/runner/start-runner.sh

# Set environment for faster npm operations
ENV JOBS=max
ENV NODE_OPTIONS="--max-old-space-size=4096"

ENTRYPOINT ["/home/runner/start-runner.sh"]