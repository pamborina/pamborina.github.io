/**
 * BranchService
 * Manages official Pamborina branches:
 * 1. فرع الطالبية
 * 2. فرع الجيزة
 * Includes Haversine geolocation calculation for finding nearest branch.
 */

import { Branch } from '../types';
import branchesData from '../data/branches.json';
import { storageService } from './storageService';
import { STORE_CONFIG } from '../config/storeConfig';
import { firebaseBranchService } from './firebaseBranchService';

export const OFFICIAL_BRANCHES: Branch[] = (branchesData as Branch[]) || STORE_CONFIG.branches;

/**
 * Calculates Haversine distance in kilometers between two lat/lng points
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const branchService = {
  getBranchesSync(): Branch[] {
    return firebaseBranchService.getBranchesSync();
  },

  async getBranches(): Promise<Branch[]> {
    try {
      return await firebaseBranchService.getBranches();
    } catch {
      return firebaseBranchService.getBranchesSync();
    }
  },

  getBranchByIdSync(id: string): Branch | null {
    if (!id) return null;
    return firebaseBranchService.getBranchesSync().find((b) => b.id === id) || null;
  },

  async getBranchById(id: string): Promise<Branch | null> {
    return this.getBranchByIdSync(id);
  },

  getSelectedBranch(): Branch | null {
    const savedId = storageService.getSelectedBranchId('');
    if (!savedId) return null;
    return this.getBranchByIdSync(savedId);
  },

  setSelectedBranch(branchId: string): void {
    storageService.setSelectedBranchId(branchId);
    const branch = this.getBranchByIdSync(branchId);
    if (branch) {
      storageService.logActivity('اختار فرع', branch.nameAr);
      storageService.addNotification({
        type: 'branch_select',
        titleAr: 'تم اختيار الفرع',
        messageAr: `تم اعتماد ${branch.nameAr} لتلقي طلبك.`,
      });
    }
  },

  /**
   * Finds nearest branch given customer GPS coordinates
   */
  findNearestBranch(lat: number, lng: number): { branch: Branch; distanceKm: number } {
    let nearestBranch = OFFICIAL_BRANCHES[0];
    let minDistance = Infinity;

    for (const b of OFFICIAL_BRANCHES) {
      const dist = calculateDistanceKm(lat, lng, b.coordinates.lat, b.coordinates.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestBranch = b;
      }
    }

    return {
      branch: nearestBranch,
      distanceKm: Number(minDistance.toFixed(2)),
    };
  },
};
