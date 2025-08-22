Get Device Info (replace [Device ID] with actual subscribed device id)
http://192.168.4.44/apps/api/37/devices/[Device ID]?access_token=b9846a66-8bf8-457a-8353-fd16d511a0af

Get Device Event History (replace [Device ID] with actual subscribed device id)
http://192.168.4.44/apps/api/37/devices/[Device ID]/events?access_token=b9846a66-8bf8-457a-8353-fd16d511a0af

Get Device Commands (replace [Device ID] with actual subscribed device id)
http://192.168.4.44/apps/api/37/devices/[Device ID]/commands?access_token=b9846a66-8bf8-457a-8353-fd16d511a0af

Get Device Capabilities (replace [Device ID] with actual subscribed device id)
http://192.168.4.44/apps/api/37/devices/[Device ID]/capabilities?access_token=b9846a66-8bf8-457a-8353-fd16d511a0af

Get Device Attribute (replace [Device ID] with actual subscribed device id and [Attribute] with a supported device attribute)
http://192.168.4.44/apps/api/37/devices/[Device ID]/attribute/[Attribute]?access_token=b9846a66-8bf8-457a-8353-fd16d511a0af

Send Device Command (replace [Device ID] with actual subscribed device id and [Command] with a supported command.  Supports optional [Secondary value])
http://192.168.4.44/apps/api/37/devices/[Device ID]/[Command]/[Secondary value]?access_token=b9846a66-8bf8-457a-8353-fd16d511a0af

Send POST URL (replace [URL] with actual URL to send POST to (URL encoded))
http://192.168.4.44/apps/api/37/postURL/[URL]?access_token=b9846a66-8bf8-457a-8353-fd16d511a0af
