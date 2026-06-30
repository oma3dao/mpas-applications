# mpas-applications

MPAS application plugins, bridges, and the builder tool that generates them.

This repository contains both the toolchain for generating MPAS-compatible bridges from existing MCP servers and the generated application artifacts themselves.

## Structure

```
mpas-applications/
  README.md
  ROADMAP.md
  LICENSE

  tool/                          # The bridge builder toolchain
    package.json
    src/
      discovery/
      classification/
      plugin-generator/
      registry-entry-generator/
      bridge-generator/
      test-harness/
    templates/
      bridge-typescript/
      plugin/
      test-suite/

  docs/                          # Project history and feature plans
    features/
      v1-bridge-builder/
        plan.md                  # v1 product plan and architecture

  applications/                  # Generated and contributed applications
    github/
      plugin.json
      descriptor.md
      discovery/
        tools-list.snapshot.json
        metadata.json
      bridge/
        package.json
        src/
        tests/
      classification.json
    slack/
      ...
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full list of planned, in-progress, and completed applications. To request a new application or volunteer to build one, open a PR updating the roadmap.

## How Applications Are Created

The `tool/` directory contains the bridge builder, which:

1. Connects to an upstream MCP server and discovers its tools.
2. Classifies tools by risk level (read, low-write, high-impact, admin).
3. Generates an MPAS Application Plugin and bridge server.
4. Generates compatibility and approval tests.
5. Writes the output to `applications/<name>/` for human review.

You can also build an application manually following the same folder structure.

## How the Bridge Works

For any existing MCP server, the generated bridge acts as a drop-in replacement. Agents see the same tools, but high-impact actions are intercepted for MPAS approval before being forwarded upstream.

```
Agent
  → Generated MPAS Bridge (drop-in replacement)
  → Original MCP Server
  → Application API
```

## Specifications

Applications conform to the MPAS protocol:

- [mpas-specification.md](https://github.com/oma3dao/mpas-docs/blob/main/specification/mpas-specification.md) — Core protocol
- [mpas-profile-application-plugin.md](https://github.com/oma3dao/mpas-docs/blob/main/specification/mpas-profile-application-plugin.md) — Application Plugin Profile
- [mpas-profile-mcp.md](https://github.com/oma3dao/mpas-docs/blob/main/specification/mpas-profile-mcp.md) — MCP Profile

## Related Repositories

| Repository | Description |
| --- | --- |
| [oma3dao/mpas-docs](https://github.com/oma3dao/mpas-docs) | MPAS specification documents |
| [oma3dao/mpas-sdk](https://github.com/oma3dao/mpas-sdk) | SDK packages including the MCP Bridge |
| [wivity/mpas-tools](https://github.com/wivity/mpas-tools) | Other MPAS tooling |

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
