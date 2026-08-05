import { describe, it, expect } from 'vitest';
import { formatTime, formatRestTime, isValidVideoUrl, isValidUploadFile, calculateTotalVolume, detectPersonalRecords, generateWorkoutShareText } from '../utils';

describe('utils formatting & security tests', () => {
  describe('formatTime', () => {
    it('formats milliseconds to MM:SS', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(65000)).toBe('01:05');
      expect(formatTime(3600000)).toBe('60:00');
    });

    it('handles negative or invalid values gracefully', () => {
      expect(formatTime(-1000)).toBe('00:00');
    });
  });

  describe('formatRestTime', () => {
    it('formats milliseconds to MM:SS.CC', () => {
      expect(formatRestTime(0)).toBe('00:00.00');
      expect(formatRestTime(65430)).toBe('01:05.43');
    });

    it('handles negative values by clamping to 00:00.00', () => {
      expect(formatRestTime(-500)).toBe('00:00.00');
    });
  });

  describe('isValidVideoUrl', () => {
    it('allows valid http, https, relative, and blob URLs', () => {
      expect(isValidVideoUrl('https://example.com/video.mp4')).toBe(true);
      expect(isValidVideoUrl('http://example.com/video.mp4')).toBe(true);
      expect(isValidVideoUrl('/videos/demo.mp4')).toBe(true);
      expect(isValidVideoUrl('blob:http://localhost/123')).toBe(true);
    });

    it('rejects XSS vectors like javascript: or data:text/html', () => {
      expect(isValidVideoUrl('javascript:alert(1)')).toBe(false);
      expect(isValidVideoUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isValidVideoUrl('')).toBe(false);
      expect(isValidVideoUrl(undefined)).toBe(false);
    });
  });

  describe('isValidUploadFile', () => {
    it('validates file mime types', () => {
      const videoFile = new File([''], 'test.mp4', { type: 'video/mp4' });
      const scriptFile = new File([''], 'test.exe', { type: 'application/x-msdownload' });

      expect(isValidUploadFile(videoFile, ['video/'])).toBe(true);
      expect(isValidUploadFile(scriptFile, ['video/', 'image/'])).toBe(false);
    });
  });

  describe('calculateTotalVolume', () => {
    it('calculates total volume in kg for P1', () => {
      const exercises = [
        {
          sets: [
            { weight: '100', reps: '10', completed: true },
            { weight: '100', reps: '8', completed: true },
          ]
        }
      ];
      expect(calculateTotalVolume(exercises)).toBe(1800);
    });

    it('calculates total volume for P2 in Dual Mode', () => {
      const exercises = [
        {
          sets: [
            { weight: '100', reps: '10', completed: true, weightP2: '80', repsP2: '10', completedP2: true },
          ]
        }
      ];
      expect(calculateTotalVolume(exercises, 'p2')).toBe(800);
    });
  });

  describe('detectPersonalRecords', () => {
    it('detects new PRs when weight exceeds previous max', () => {
      const currentMaxes = { 'Supino Reto': 100 };
      const newExercises = [
        {
          name: 'Supino Reto',
          sets: [
            { weight: '110', reps: '5', completed: true }
          ]
        }
      ];
      const result = detectPersonalRecords(currentMaxes, newExercises);
      expect(result.prs).toContain('Supino Reto: 110kg');
      expect(result.updatedMaxes['Supino Reto']).toBe(110);
    });

    it('does not flag PR if weight is less or equal', () => {
      const currentMaxes = { 'Supino Reto': 100 };
      const newExercises = [
        {
          name: 'Supino Reto',
          sets: [
            { weight: '90', reps: '10', completed: true }
          ]
        }
      ];
      const result = detectPersonalRecords(currentMaxes, newExercises);
      expect(result.prs).toHaveLength(0);
      expect(result.updatedMaxes['Supino Reto']).toBe(100);
    });
  });

  describe('generateWorkoutShareText', () => {
    it('generates aesthetic shareable text with metrics and PRs', () => {
      const workout = {
        name: 'Treino de Peito A',
        durationMs: 3600000,
        volumeKg: 4500,
        prs: ['Supino Reto: 120kg'],
        partner1Name: 'Elon',
        partner2Name: 'Zuck'
      };
      const text = generateWorkoutShareText(workout);
      expect(text).toContain('Treino de Peito A');
      expect(text).toContain('60:00');
      expect(text).toContain('4500 kg');
      expect(text).toContain('Elon & Zuck');
      expect(text).toContain('Supino Reto: 120kg');
      expect(text).toContain('#Zenlift');
    });
  });
});

