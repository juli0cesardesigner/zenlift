import { formatTime, formatRestTime, isValidVideoUrl, isValidUploadFile } from '../utils';

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
});
