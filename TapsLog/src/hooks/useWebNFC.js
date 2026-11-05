/**
 * useWebNFC.js — Native Web NFC (NDEFReader) Hook for Android Chrome
 * 
 * Extracts physical card UID directly from event.serialNumber (NXP MIFARE Classic 1k chips).
 * Provides permission states, scan loops, audio/haptic feedback, and error handling.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playBeep } from '../lib/utils';

export function useWebNFC() {
  const [isSupported, setIsSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedUid, setLastScannedUid] = useState(null);
  const [nfcError, setNfcError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'granted' | 'denied' | 'prompt'

  const ndefReaderRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Check Web NFC availability on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setIsSupported(true);
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions
          .query({ name: 'nfc' })
          .then((status) => {
            setPermissionStatus(status.state);
            status.onchange = () => setPermissionStatus(status.state);
          })
          .catch(() => {
            // Permissions query for NFC not universally implemented in all browsers
          });
      }
    } else {
      setIsSupported(false);
    }

    return () => {
      stopScanning();
    };
  }, []);

  /**
   * Formats raw hardware serial number to colon-separated uppercase hex (e.g. 65:49:9D:00)
   */
  const formatSerialNumber = (rawSerial) => {
    if (!rawSerial) return '';
    const clean = rawSerial.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    return clean.match(/.{1,2}/g)?.join(':') || clean;
  };

  /**
   * Start scanning for physical NFC cards
   */
  const startScanning = useCallback(
    async ({ onReading, onError } = {}) => {
      if (!('NDEFReader' in window)) {
        const errorMsg = 'Web NFC is not supported on this device/browser. Please use Chrome on Android.';
        setNfcError(errorMsg);
        if (onError) onError(new Error(errorMsg));
        return false;
      }

      try {
        setNfcError(null);
        abortControllerRef.current = new AbortController();
        const reader = new window.NDEFReader();
        ndefReaderRef.current = reader;

        await reader.scan({ signal: abortControllerRef.current.signal });
        setIsScanning(true);

        reader.onreading = (event) => {
          // Hardware Tag UID is extracted directly from event.serialNumber
          const rawUid = event.serialNumber;
          const formattedUid = formatSerialNumber(rawUid);

          setLastScannedUid(formattedUid);

          // Haptic vibration feedback (Short double pulse)
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([40, 30, 80]);
          }

          // Audio feedback
          playBeep('success');

          if (onReading) {
            onReading({
              rawUid,
              serialNumber: formattedUid,
              event,
            });
          }
        };

        reader.onreadingerror = (error) => {
          console.error('[Web NFC Reading Error]:', error);
          playBeep('error');
          setNfcError('Failed to read NFC tag. Please hold card steady against the reader.');
          if (onError) onError(error);
        };

        return true;
      } catch (err) {
        console.error('[Web NFC Scan Error]:', err);
        setIsScanning(false);
        const userFriendlyMsg =
          err.name === 'NotAllowedError'
            ? 'NFC permission was denied. Please allow NFC access in Chrome settings.'
            : err.message || 'Failed to start NFC scanner.';
        setNfcError(userFriendlyMsg);
        if (onError) onError(err);
        return false;
      }
    },
    []
  );

  /**
   * Stop NFC scan loop and release hardware antenna
   */
  const stopScanning = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    ndefReaderRef.current = null;
    setIsScanning(false);
  }, []);

  return {
    isSupported,
    isScanning,
    lastScannedUid,
    nfcError,
    permissionStatus,
    startScanning,
    stopScanning,
    setNfcError,
  };
}