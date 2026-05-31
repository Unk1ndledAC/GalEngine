# GalEngine Data Pack (.gpk) Format Specification

## Overview

The `.gpk` (GalEngine PacKage) format is the compiled binary format for GalEngine games and patches/DLCs.
It packages game assets and compiled scripts into a single distributable file.

## Version

Current format version: `1.0`

## File Structure

```
┌─────────────────────────────────┐
│  Header (64 bytes)              │
├─────────────────────────────────┤
│  File Index (variable)          │
├─────────────────────────────────┤
│  Metadata Block (JSON, zlib)    │
├─────────────────────────────────┤
│  Script Block (compiled scene   │
│  data, zlib compressed)         │
├─────────────────────────────────┤
│  Asset Data Block               │
│  (raw or encrypted assets)      │
└─────────────────────────────────┘
```

## Header (64 bytes)

| Offset | Size | Field        | Description                    |
|--------|------|--------------|--------------------------------|
| 0      | 4    | magic        | `0x4750474B` ("GPKG")          |
| 4      | 2    | version      | Format version (1)             |
| 6      | 2    | flags        | Bit flags (see below)          |
| 8      | 8    | index_offset | Byte offset to File Index      |
| 16     | 8    | index_size   | Size of File Index in bytes    |
| 24     | 8    | meta_offset  | Byte offset to Metadata Block  |
| 32     | 8    | meta_size    | Compressed size of metadata    |
| 40     | 8    | assets_offset| Byte offset to Asset Data      |
| 48     | 8    | assets_size  | Total size of asset data       |
| 56     | 8    | reserved     | Reserved for future use        |

### Flags

| Bit | Name         | Description                    |
|-----|--------------|--------------------------------|
| 0   | ENCRYPTED    | Assets are encrypted           |
| 1   | PATCH        | This is a patch/DLC package    |
| 2   | COMPRESSED   | Overall archive is compressed  |
| 3-15| RESERVED     | Reserved                       |

## File Index

Array of file entries, each 128 bytes:

| Offset | Size | Field       | Description                     |
|--------|------|-------------|---------------------------------|
| 0      | 64   | filename    | UTF-8 path (null-padded)        |
| 64     | 8    | offset      | Byte offset within Asset Block  |
| 72     | 8    | size        | Uncompressed file size          |
| 80     | 8    | compressed  | Compressed size (0 if raw)      |
| 88     | 4    | crc32       | CRC32 checksum                  |
| 92     | 4    | type        | 0=raw, 1=zlib, 2=lzma          |
| 96     | 32   | reserved    | Reserved                        |

## Metadata Block

JSON object compressed with zlib:

```json
{
  "pack_id": "com.example.mygame",
  "version": "1.0.0",
  "type": "game",
  "engine_version": "0.1.0",
  "title": "My Game",
  "author": "Developer",
  "scenes": ["scene_prologue", "scene_chapter1", ...],
  "languages": ["zh-CN", "en"],
  "dependencies": {
    "base_game": ">=1.0.0"
  },
  "created": "2026-05-31T12:00:00Z"
}
```

## Asset Data Block

Contains all game assets (images, audio, fonts) concatenated with optional per-file compression.
Files are stored in the order listed in the File Index.
