FROM mcr.microsoft.com/devcontainers/typescript-node:0-18

ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV PATH=/home/node/depot_tools:${PNPM_HOME}:${PATH}

RUN su node -c "npm install -g pnpm@7"

RUN su node -c "pnpm install -g prisma playwright"

RUN su node -c "git clone --filter=tree:0 https://chromium.googlesource.com/chromium/tools/depot_tools.git /home/node/depot_tools && gclient"

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g <your-package-list-here>"
