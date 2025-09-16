/**
 * LIFX Themes Module
 * Provides methods to control LIFX Beam themes via Home Assistant API
 */

class LIFXThemes {
    constructor() {
        this.haUrl = 'http://192.168.4.145:8123';
        this.accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhNzU0MDhhNTYxYmQ0NTVjOTA3NTFmZDg0OTQ2MzMzOCIsImlhdCI6MTc1NTE5OTg1NywiZXhwIjoyMDcwNTU5ODU3fQ.NMPxvnz0asFM66pm7LEH80BIGR9dU8pj6IZEX5v3WB4';
        this.beamEntity = 'light.beam';
        this.themeEntity = 'select.beam_theme';
    }

    /**
     * Set a specific theme on the LIFX Beam
     * @param {string} theme - Theme name (e.g., 'exciting', 'calm', 'party')
     */
    async setTheme(theme) {
        try {
            const response = await fetch(`${this.haUrl}/api/services/select/select_option`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    entity_id: this.themeEntity,
                    option: theme
                })
            });
            
            if (response.ok) {
                console.log(`LIFX Beam theme set to: ${theme}`);
                return true;
            } else {
                console.error(`Failed to set theme: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error('Error setting LIFX Beam theme:', error);
            return false;
        }
    }

    /**
     * Cycle to the next theme
     */
    async nextTheme() {
        try {
            const response = await fetch(`${this.haUrl}/api/services/select/select_next`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    entity_id: this.themeEntity
                })
            });
            
            if (response.ok) {
                console.log('LIFX Beam theme cycled to next');
                return true;
            } else {
                console.error(`Failed to cycle theme: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error('Error cycling LIFX Beam theme:', error);
            return false;
        }
    }

    /**
     * Cycle to the previous theme
     */
    async previousTheme() {
        try {
            const response = await fetch(`${this.haUrl}/api/services/select/select_previous`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    entity_id: this.themeEntity
                })
            });
            
            if (response.ok) {
                console.log('LIFX Beam theme cycled to previous');
                return true;
            } else {
                console.error(`Failed to cycle theme: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error('Error cycling LIFX Beam theme:', error);
            return false;
        }
    }

    /**
     * Get current theme
     */
    async getCurrentTheme() {
        try {
            const response = await fetch(`${this.haUrl}/api/states/${this.themeEntity}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.state;
            } else {
                console.error(`Failed to get current theme: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error('Error getting current theme:', error);
            return null;
        }
    }

    /**
     * Get all available themes
     */
    async getAvailableThemes() {
        try {
            const response = await fetch(`${this.haUrl}/api/states/${this.themeEntity}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.attributes.options || [];
            } else {
                console.error(`Failed to get available themes: ${response.status}`);
                return [];
            }
        } catch (error) {
            console.error('Error getting available themes:', error);
            return [];
        }
    }

    /**
     * Set theme with transition effect
     * @param {string} theme - Theme name
     * @param {number} transition - Transition duration in seconds
     */
    async setThemeWithTransition(theme, transition = 3) {
        try {
            const response = await fetch(`${this.haUrl}/api/services/lifx/paint_theme`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    entity_id: this.beamEntity,
                    theme: theme,
                    transition: transition
                })
            });
            
            if (response.ok) {
                console.log(`LIFX Beam theme set to: ${theme} with ${transition}s transition`);
                return true;
            } else {
                console.error(`Failed to set theme with transition: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error('Error setting LIFX Beam theme with transition:', error);
            return false;
        }
    }

    /**
     * Set custom palette using scene paint
     * @param {Array} colors - Array of hex colors for the palette
     * @param {number} transition - Transition duration in seconds
     */
    async setCustomPalette(colors, transition = 3) {
        try {
            // Convert hex colors to HSL format for LIFX paint_theme
            const hslPalette = colors.map(color => {
                const hex = color.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16) / 255;
                const g = parseInt(hex.substr(2, 2), 16) / 255;
                const b = parseInt(hex.substr(4, 2), 16) / 255;
                
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const l = (max + min) / 2;
                
                let h, s;
                if (max === min) {
                    h = s = 0; // achromatic
                } else {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    switch (max) {
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        case b: h = (r - g) / d + 4; break;
                    }
                    h /= 6;
                }
                
                // Convert to LIFX format: [hue (0-360), saturation (0-100), brightness (0-100), kelvin (1500-9000)]
                return [
                    Math.round(h * 360),
                    Math.round(s * 100),
                    80, // brightness
                    3500 // kelvin
                ];
            });

            const response = await fetch(`${this.haUrl}/api/services/lifx/paint_theme`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    entity_id: this.beamEntity,
                    palette: hslPalette,
                    transition: transition
                })
            });
            
            if (response.ok) {
                console.log(`LIFX Beam custom palette applied with ${colors.length} colors`);
                return true;
            } else {
                console.error(`Failed to set custom palette: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error('Error setting LIFX Beam custom palette:', error);
            return false;
        }
    }

    /**
     * Apply custom palette with effect
     * @param {Array} colors - Array of hex colors for the palette
     * @param {string} effect - Effect name (e.g., 'effect_colorloop', 'effect_pulse')
     * @param {number} transition - Transition duration in seconds
     */
    async applyCustomPaletteWithEffect(colors, effect = 'effect_colorloop', transition = 3) {
        try {
            // First set the palette
            await this.setCustomPalette(colors, transition);
            
            // Wait a moment for the palette to apply
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Then apply the effect
            const response = await fetch(`${this.haUrl}/api/services/lifx/${effect}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    entity_id: this.beamEntity,
                    brightness_pct: 80,
                    period: 3,
                    change: 45
                })
            });
            
            if (response.ok) {
                console.log(`LIFX Beam custom palette with ${effect} applied`);
                return true;
            } else {
                console.error(`Failed to apply effect: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error('Error applying LIFX Beam custom palette with effect:', error);
            return false;
        }
    }

    /**
     * Stop all effects
     */
    async stopEffects() {
        try {
            const response = await fetch(`${this.haUrl}/api/services/lifx/effect_stop`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    entity_id: this.beamEntity
                })
            });
            
            if (response.ok) {
                console.log('LIFX Beam effects stopped');
                return true;
            } else {
                console.error(`Failed to stop effects: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error('Error stopping LIFX Beam effects:', error);
            return false;
        }
    }
}

// Create instance and export to window
const lifxThemes = new LIFXThemes();
window.lifxThemes = lifxThemes;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LIFXThemes;
}
