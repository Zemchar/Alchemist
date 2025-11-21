export interface Experience {
    location: Location | null;
    timedNotes: any[];
    sortDate: number;
    isFavorite: boolean;
    ingestions: Ingestion[];
    text: string;
    creationDate: number;
    ratings: any[];
    title: string;
    fullJSON: string;
}
export interface Location {
    name?: string;
    latitude?: number;
    longitude?: number;
}

export class Mass {
    base: number = 0; // the base value for the number in mg
    multiplier: number = 0;
    adjusted: number = 0;
    unit: string = "mg"

    constructor(massStr: string) {
        const match = massStr.match(/^(\d+\.?\d*)([a-zA-Zµ]+)$/);
        if (!match) {
            throw new Error(`Invalid mass format. Expected format: number followed by units (e.g., "100mg")\nGot: ${massStr}`);
        }
        this.base = parseFloat(match[1]) * Mass.getMultiplierFromUnit(match[2]); // Convert to mg
        this.unit = match[2].toLowerCase();
        this.multiplier = Mass.getMultiplierFromUnit(this.unit);
        this.adjusted = this.base / Mass.getMultiplierFromUnit(this.unit);
        this.setNewUnitFromBase();
    }

    /**
     * Gets the multiplier value for the given unit of measurement.
     *
     * @param unit The unit of measurement as a string (e.g., 'mcg', 'mg', 'g', 'kg').
     * @return The multiplier corresponding to the unit. If the unit is not recognized, returns 1 by default.
     * @private
     */
    public static getMultiplierFromUnit(unit: string): number {
        const check = unit.toLowerCase();
        switch (check) {
            case check.startsWith('µ') && check:
            case check.startsWith('mc') && check:
            case check.startsWith('u') && check:
                return 0.001;
            case check.startsWith('m') && check:
                return 1;
            case check.startsWith('g') && check:
                return 1000;
            case check.startsWith('k') && check:
                return 1000000;
            default:
                return 1;
        }
    }

    private setNewUnitFromBase() {
        const value = this.base;
        if (value >= 1000000) {
            this.unit = 'kg';
            this.adjusted = value / 1000000;
        } else if (value >= 1000) {
            this.unit = 'g';
            this.adjusted = value / 1000;
        } else if (value >= 1) {
            this.unit = 'mg';
            this.adjusted = value;
        } else {
            this.unit = 'mcg';
            this.adjusted = value * 1000;
        }
        this.multiplier = Mass.getMultiplierFromUnit(this.unit);
        return this.unit;
    }

    /**
     * Adds a mass value to the current base value after converting it to the specified unit.
     *
     * @param {string} massString - The string representation of the mass to be added.
     * @return {number} The updated base value after adding the converted mass.
     */
    public add(massString: string) {
        let m = new Mass(massString);
        this.base += m.base;
        this.setNewUnitFromBase();
        return this.base;
    }

    /**
     * Converts the base mass to a string representation in the desired unit.
     *
     * @param {string} desiredUnit - The unit to which the base mass should be converted.
     * @return {string} A string representation of the mass in the desired unit.
     */
    public getMassString(desiredUnit: string) {
        const value = this.base / Mass.getMultiplierFromUnit(desiredUnit);
        return value + desiredUnit;
    }

    public toString() {
        return this.adjusted + this.unit;
    }

    /**
     * Calculates the mass number in the specified unit.
     *
     * @param {string} desiredUnit - The unit in which the mass number should be calculated.
     * @return {number} The calculated mass number in the desired unit.
     */
    public getMassNumber(desiredUnit: string) {
        return this.base / Mass.getMultiplierFromUnit(desiredUnit);
    }
}
export interface Ingestion {
    dose: Mass;
    substanceName: string;
    units: string;
    administrationRoute: string;
    time: number;
    notes: string;
    creationDate: number;
    consumerName: string | null;
    endTime: number | null;
    isDoseAnEstimate: boolean;
    estimatedDoseStandardDeviation: number | null;
    customUnitId: number | null;
    stomachFullness: string | null;
}

/// SUBSTANCE SCREEN
// src/constants/DataTypes.ts (Updated types)

// Define common nested structures first

export interface TimingDetailValue {
    value: string;
    unit: string;
}

export interface TimingDetail {
    [roa: string]: TimingDetailValue;
}

export interface Timing {
    onset: TimingDetail;
    duration: TimingDetail;
    aftereffects: TimingDetail;
}

export interface DosageRouteValue {
    units: string;
    threshold: number | null;
    light: { min: number; max: number | null };
    common: { min: number; max: number | null };
    strong: { min: number; max: number | null };
    heavy: number | null;
}

export interface DosageRoutes {
    [roa: string]: DosageRouteValue;
}

export interface Dosage {
    routes: DosageRoutes;
    bioavailability: number | null;
}

export interface Properties {
    summary: string;
    avoid: string;
    test_kits: string;
    half_life: string;
    warnings: string[];
    note: string;
}

export interface Links {
    experiences: string[];
    research: string[];
    wikipedia: string[];
    general: string[];
}

export interface LegalStatus {
    international: string;
}

export interface Metadata {
    last_updated: string;
    source_url: string;
    confidence_score: number | null;
}

// This interface describes the structure of data *inside* "tripsit" or "psychonautwiki"
export interface SubstanceDataContent {
    name: string;
    pretty_name: string;
    aliases: string[];
    categories: string[];
    properties: Properties;
    timing: Timing;
    dosage: Dosage;
    effects: string[]; // Simple array of effect names
    effects_detailed: { name: string; url: string; category: string }[]; // Detailed effects
    interactions: {
        dangerous: string[];
        unsafe: string[];
        caution: string[];
    };
    links: Links;
    legal_status: LegalStatus;
    metadata: Metadata;
}

// This interface describes a single raw substance entry from data.json,
// which can contain "tripsit" and/or "psychonautwiki" data.
export interface RawSubstanceDataItem {
    tripsit?: SubstanceDataContent;
    psychonautwiki?: SubstanceDataContent;
}

// This interface describes the entire raw data.json file structure
export interface RawSubstanceData {
    [substanceName: string]: RawSubstanceDataItem;
}

// This interface describes the final MERGED data object for a substance,
// which will be used in the FlatList and passed to detail screens.
export interface MergedSubstanceData extends SubstanceDataContent {
    // Additionally, include the raw data sources for deep inspection if needed
    tripsitData?: SubstanceDataContent;
    psychonautwikiData?: SubstanceDataContent;
}