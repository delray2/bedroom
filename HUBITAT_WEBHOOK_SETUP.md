# Hubitat Webhook Setup Guide

This guide explains how to configure Hubitat to send real-time device state updates to the dashboard via webhooks using the **postURL** endpoint.

## Overview

The dashboard now includes a centralized state management system that can receive real-time updates from Hubitat when device states change. This eliminates the need for manual polling and ensures the UI always reflects the current state of your devices.

## Webhook Endpoint

The dashboard backend listens for webhooks at:
```
http://192.168.4.135:4711/api/hubitat/webhook
```

## Hubitat Webhook Structure

Hubitat uses the **postURL** endpoint to send webhooks. The format is:
```
http://192.168.4.44/apps/api/37/postURL/[URL_ENCODED_WEBHOOK_URL]?access_token=b9846a66-8bf8-457a-8353-fd16d511a0af
```

## Setup Steps

### 1. URL Encode Your Webhook URL

Your dashboard webhook endpoint needs to be URL encoded:

```
Original: http://192.168.4.135:4711/api/hubitat/webhook
Encoded: http%3A%2F%2F192.168.4.135%3A4711%2Fapi%2Fhubitat%2Fwebhook
```

### 2. Configure Hubitat Rules Engine

The most reliable way to set up webhooks is through Hubitat's Rules Engine:

1. **Go to Rules** → **Create New Rule**
2. **Set Trigger**: "When device attribute changes"
3. **Select Device**: Choose the device you want to monitor
4. **Select Attribute**: Choose the attribute to monitor (e.g., `switch`, `level`, `hue`)
5. **Add Action**: "Send HTTP Request"
6. **Configure HTTP Request**:
   - **URL**: `http://192.168.4.44/apps/api/37/postURL/http%3A%2F%2F192.168.4.135%3A4711%2Fapi%2Fhubitat%2Fwebhook?access_token=b9846a66-8bf8-457a-8353-fd16d511a0af`
   - **Method**: POST
   - **Content Type**: application/json
   - **Body**: See payload examples below

### 3. Webhook Payload Examples

#### Light Bulbs (LIFX, etc.)
```json
{
  "deviceId": "{{device.id}}",
  "deviceName": "{{device.displayName}}",
  "attributes": {
    "switch": "{{device.currentValue('switch')}}",
    "level": "{{device.currentValue('level')}}",
    "hue": "{{device.currentValue('hue')}}",
    "saturation": "{{device.currentValue('saturation')}}",
    "colorTemperature": "{{device.currentValue('colorTemperature')}}"
  },
  "event": "attribute_change",
  "timestamp": "{{now()}}"
}
```

#### Smart Locks
```json
{
  "deviceId": "{{device.id}}",
  "deviceName": "{{device.displayName}}",
  "attributes": {
    "lock": "{{device.currentValue('lock')}}",
    "contact": "{{device.currentValue('contact')}}"
  },
  "event": "attribute_change",
  "timestamp": "{{now()}}"
}
```

#### Thermostats
```json
{
  "deviceId": "{{device.id}}",
  "deviceName": "{{device.displayName}}",
  "attributes": {
    "temperature": "{{device.currentValue('temperature')}}",
    "thermostatMode": "{{device.currentValue('thermostatMode')}}",
    "heatingSetpoint": "{{device.currentValue('heatingSetpoint')}}",
    "coolingSetpoint": "{{device.currentValue('coolingSetpoint')}}"
  },
  "event": "attribute_change",
  "timestamp": "{{now()}}"
}
```

### 4. Alternative: Use Hubitat Webhook App

If you prefer to use the Webhook app instead of Rules:

1. **Install Webhook App** from Hubitat App Library
2. **Configure webhook** with the postURL endpoint
3. **Set triggers** for device attribute changes
4. **Configure payload** using the examples above

### 5. Test the Webhook

1. **Make a change** to a device (e.g., turn on a light)
2. **Check dashboard console** for webhook messages
3. **Verify UI updates** automatically
4. **Check Hubitat logs** for webhook delivery status

## Advanced Configuration

### Conditional Webhooks

Set up webhooks that only fire under certain conditions:

```groovy
// Only send webhook when brightness changes significantly
if (device.currentValue('level') - device.previousValue('level').abs() > 5) {
    // Send webhook with postURL
    def webhookUrl = "http://192.168.4.44/apps/api/37/postURL/http%3A%2F%2F192.168.4.135%3A4711%2Fapi%2Fhubitat%2Fwebhook?access_token=b9846a66-8bf8-457a-8353-fd16d511a0af"
    
    def payload = [
        deviceId: device.id,
        deviceName: device.displayName,
        attributes: [
            switch: device.currentValue('switch'),
            level: device.currentValue('level')
        ],
        event: "attribute_change",
        timestamp: now()
    ]
    
    httpPost(webhookUrl, payload)
}
```

### Batch Updates

For multiple devices, you can send a single webhook:

```groovy
// Send webhook for multiple devices
def webhookUrl = "http://192.168.4.44/apps/api/37/postURL/http%3A%2F%2F192.168.4.135%3A4711%2Fapi%2Fhubitat%2Fwebhook?access_token=b9846a66-8bf8-457a-8353-fd16d511a0af"

def payload = [
    devices: [
        [
            deviceId: "447",
            attributes: [ switch: "on", level: "100" ]
        ],
        [
            deviceId: "450", 
            attributes: [ switch: "off", level: "0" ]
        ]
    ],
    event: "bulk_update",
    timestamp: now()
]

httpPost(webhookUrl, payload)
```

### Device-Specific Webhooks

Create different webhook rules for different device types:

```groovy
// For lights - monitor switch, level, hue, saturation
if (device.typeName.contains("LIFX") || device.typeName.contains("Light")) {
    def webhookUrl = "http://192.168.4.44/apps/api/37/postURL/http%3A%2F%2F192.168.4.135%3A4711%2Fapi%2Fhubitat%2Fwebhook?access_token=b9846a66-8bf8-457a-8353-fd16d511a0af"
    
    def payload = [
        deviceId: device.id,
        deviceType: "light",
        attributes: [
            switch: device.currentValue('switch'),
            level: device.currentValue('level'),
            hue: device.currentValue('hue'),
            saturation: device.currentValue('saturation'),
            colorTemperature: device.currentValue('colorTemperature')
        ],
        event: "attribute_change"
    ]
    
    httpPost(webhookUrl, payload)
}

// For locks - monitor lock and contact
if (device.typeName.contains("Lock")) {
    def webhookUrl = "http://192.168.4.44/apps/api/37/postURL/http%3A%2F%2F192.168.4.135%3A4711%2Fapi%2Fhubitat%2Fwebhook?access_token=b9846a66-8bf8-457a-8353-fd16d511a0af"
    
    def payload = [
        deviceId: device.id,
        deviceType: "lock",
        attributes: [
            lock: device.currentValue('lock'),
            contact: device.currentValue('contact')
        ],
        event: "attribute_change"
    ]
    
    httpPost(webhookUrl, payload)
}
```

## Troubleshooting

### Webhook Not Received
- **Check IP address**: Ensure you're using `192.168.4.135` (your dashboard's IP)
- **Check URL encoding**: Ensure the webhook URL is properly URL encoded
- **Verify access token**: Confirm the access token is correct
- **Check network**: Ensure Hubitat can reach `192.168.4.135:4711`
- **Review Hubitat logs**: Look for webhook delivery errors

### Common URL Encoding Issues
```
❌ Wrong: http://192.168.4.44/apps/api/37/postURL/http://192.168.4.135:4711/api/hubitat/webhook
✅ Correct: http://192.168.4.44/apps/api/37/postURL/http%3A%2F%2F192.168.4.135%3A4711%2Fapi%2Fhubitat%2Fwebhook
```

### Network Connectivity Issues
- **Firewall**: Ensure port 4711 is open on your dashboard machine (192.168.4.135)
- **Router**: Check if your router blocks internal network communication
- **IP assignment**: Verify your dashboard has a static IP or DHCP reservation

### Testing Webhook Delivery
Use Hubitat's built-in testing:

1. **In your rule**, add a test action
2. **Use Hubitat's "Send HTTP Request"** action
3. **Test with a simple payload** first
4. **Check dashboard logs** for receipt

### Debug Mode
Enable debug logging in Hubitat:

```groovy
// Add to your webhook rule for debugging
log.debug "Sending webhook to: ${webhookUrl}"
log.debug "Payload: ${payload}"
```

## Performance Optimization

### Reduce Webhook Frequency
- **Use attribute change triggers** instead of polling
- **Set minimum change thresholds** for numeric values
- **Batch multiple attribute changes** when possible
- **Use conditional logic** to avoid unnecessary webhooks

### Efficient Payload Design
```groovy
// Only send changed attributes
def changedAttributes = [:]
def currentValue = device.currentValue(attributeName)
def previousValue = device.previousValue(attributeName)

if (currentValue != previousValue) {
    changedAttributes[attributeName] = currentValue
}

if (changedAttributes) {
    def payload = [
        deviceId: device.id,
        attributes: changedAttributes,
        event: "attribute_change"
    ]
    
    httpPost(webhookUrl, payload)
}
```

## Security Considerations

- **Local network only**: Webhooks are sent within your local network
- **Access token required**: Hubitat requires valid access token
- **No authentication**: Dashboard endpoint is currently open
- **Rate limiting**: Consider implementing webhook rate limiting

## Monitoring and Maintenance

### Check Webhook Status
```bash
# Test dashboard health (from another machine on your network)
curl http://192.168.4.135:4711/api/health

# Check webhook endpoint (from another machine on your network)
curl -X POST http://192.168.4.135:4711/api/hubitat/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

### Hubitat Log Monitoring
- **Enable debug logging** for webhook rules
- **Monitor webhook delivery** in Hubitat logs
- **Check for failed deliveries** and retry logic
- **Review webhook performance** metrics

## Benefits

With webhooks properly configured, you'll experience:
- **Real-time updates**: UI changes immediately when devices change
- **Reduced latency**: No more waiting for polling intervals
- **Better reliability**: State is always in sync with actual devices
- **Improved user experience**: Smooth, responsive interface
- **Reduced API calls**: More efficient communication with Hubitat

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify you're using the correct IP address (192.168.4.135)
3. Verify URL encoding is correct
4. Test webhook delivery with a simple payload
5. Review Hubitat logs for delivery errors
6. Check dashboard backend logs for receipt
