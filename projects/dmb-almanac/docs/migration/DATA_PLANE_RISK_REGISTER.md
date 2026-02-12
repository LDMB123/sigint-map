# Data Plane Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| OPFS/Storage Buckets unavailable | Corpus falls back to network each load | Fallback to network + Cache, skip persistence when unsupported |
| Bundle checksum mismatch | Corrupt corpus | Verify `index.bundleSha256`; retry network; refuse to load on mismatch |
| Storage pressure eviction | Model/corpus evicted mid-session | `storageMonitor` checks + persistent storage requests + UI warnings |
| Show date collisions | Multiple shows on same date | `slug_to_id.shows` stores arrays; show lookups use IDs |
| Large bundle parse time | Slow first load | Brotli + gzip assets, OPFS persistence, chunked JS access |
| Index drift vs bundle | Incorrect offsets | Bundle/index generated together in `build:corpus` pipeline |
