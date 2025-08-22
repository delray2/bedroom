curl -X POST "http://192.168.4.145:8123/api/services/androidtv/adb_command" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhNzU0MDhhNTYxYmQ0NTVjOTA3NTFmZDg0OTQ2MzMzOCIsImlhdCI6MTc1NTE5OTg1NywiZXhwIjoyMDcwNTU5ODU3fQ.NMPxvnz0asFM66pm7LEH80BIGR9dU8pj6IZEX5v3WB4" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "media_player.fire_tv_192_168_4_54", "command": "HDMI1"}'