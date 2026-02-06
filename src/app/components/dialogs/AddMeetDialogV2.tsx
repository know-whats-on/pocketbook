import { useState, useEffect, useRef } from 'react';
import { X, Save, Camera, Mic, Link2, Calendar, ChevronRight, QrCode } from 'lucide-react';
import { db } from '../../lib/db';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { storage } from '../../lib/storage';
import { addDays } from 'date-fns';
import { BrowserQRCodeReader } from '@zxing/library';

interface AddMeetDialogV2Props {
  open: boolean;
  onClose: () => void;
  eventId?: number;
}

type NextStepType = 'message' | 'intro' | 'send_link' | 'coffee' | 'none';

export function AddMeetDialogV2({ open, onClose, eventId }: AddMeetDialogV2Props) {
  const [screen, setScreen] = useState<'essentials' | 'extras'>('essentials');
  
  // Screen A - Essentials
  const [name, setName] = useState('');
  const [context, setContext] = useState('');
  const [nextStepType, setNextStepType] = useState<NextStepType>('none');
  const [customFollowUpDate, setCustomFollowUpDate] = useState<string>('');

  // Screen B - Extras
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [voiceNoteBlob, setVoiceNoteBlob] = useState<Blob | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | undefined>(eventId);
  const [promiseText, setPromiseText] = useState('');
  const [promiseDueDate, setPromiseDueDate] = useState<string>('');
  const [addPromise, setAddPromise] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSelfieCapture, setShowSelfieCapture] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [qrCameraStream, setQrCameraStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const qrVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const events = useLiveQuery(() => 
    db.events.orderBy('date').reverse().limit(10).toArray()
  ) ?? [];

  useEffect(() => {
    if (open) {
      // Reset form
      setScreen('essentials');
      setName('');
      setContext('');
      setNextStepType('none');
      setLinkedInUrl('');
      setPhotoUrl('');
      setVoiceNoteBlob(null);
      setSelectedEventId(eventId);
      setPromiseText('');
      setPromiseDueDate('');
      setAddPromise(false);
      setShowQRScanner(false);
      setShowSelfieCapture(false);
      setCameraStream(null);
      setQrCameraStream(null);
    }
  }, [open, eventId]);

  const nextStepOptions: { type: NextStepType; label: string }[] = [
    { type: 'message', label: 'Message' },
    { type: 'intro', label: 'Intro' },
    { type: 'send_link', label: 'Send link' },
    { type: 'coffee', label: 'Coffee' },
    { type: 'none', label: 'Nothing yet' },
  ];

  const getNextStepDescription = (type: NextStepType): string => {
    const map = {
      message: 'Send them a message',
      intro: 'Make an introduction',
      send_link: 'Send them a link',
      coffee: 'Schedule a coffee chat',
      none: ''
    };
    return map[type];
  };

  const handleSaveEssentials = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    // Quick save - create everything and close
    try {
      await saveMeet(false);
      onClose();
    } catch (error) {
      toast.error('Failed to save meet');
      console.error('Save error:', error);
    }
  };

  const handleContinueToExtras = () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    setScreen('extras');
  };

  const handleSaveExtras = async () => {
    try {
      await saveMeet(false);
      onClose();
    } catch (error) {
      toast.error('Failed to save meet');
      console.error('Save error:', error);
    }
  };

  const saveMeet = async (isDraft: boolean) => {
    // Create or find person
    let person = await db.people.where('name').equalsIgnoreCase(name.trim()).first();
    
    if (!person) {
      const personId = await db.people.add({
        name: name.trim(),
        linkedInUrl: linkedInUrl.trim() || undefined,
        photoUrl: photoUrl || undefined,
        needsRefining: isDraft,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      person = await db.people.get(personId);
    } else {
      // Update person with new info if provided
      const updates: Partial<typeof person> = { updatedAt: new Date() };
      if (linkedInUrl.trim()) updates.linkedInUrl = linkedInUrl.trim();
      if (photoUrl) updates.photoUrl = photoUrl;
      await db.people.update(person.id!, updates);
    }

    // Save voice note as data URL if exists (for persistence across sessions)
    let voiceNoteUrl: string | undefined;
    if (voiceNoteBlob) {
      voiceNoteUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(voiceNoteBlob);
      });
    }

    // Create meet
    const meetId = await db.meets.add({
      personId: person!.id,
      eventId: selectedEventId,
      when: new Date(),
      context: context.trim() || undefined,
      nextStep: nextStepType !== 'none' ? getNextStepDescription(nextStepType) : undefined,
      nextStepType,
      voiceNoteUrl,
      isDraft,
      needsRefining: isDraft,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create follow-up based on next step type and default timing
    if (nextStepType !== 'none') {
      const defaultTiming = storage.getDefaultFollowUpTiming();
      let dueDate = new Date();
      
      // Use custom date if provided, otherwise use default timing
      if (customFollowUpDate) {
        dueDate = new Date(customFollowUpDate);
      } else {
        switch (defaultTiming) {
          case '24h':
            dueDate = addDays(dueDate, 1);
            break;
          case '3d':
            dueDate = addDays(dueDate, 3);
            break;
          case '7d':
            dueDate = addDays(dueDate, 7);
            break;
        }
      }

      await db.followUps.add({
        meetId,
        personId: person!.id,
        description: getNextStepDescription(nextStepType),
        dueDate,
        priority: 'medium',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Create promise if checked
    if (addPromise && promiseText.trim()) {
      await db.promises.add({
        personId: person!.id,
        meetId,
        description: promiseText.trim(),
        status: 'pending',
        dueDate: promiseDueDate ? new Date(promiseDueDate) : undefined,
        completed: false,
        createdAt: new Date()
      });
    }

    toast.success(isDraft ? 'Draft saved' : 'Meet saved');
  };

  const handleLinkedInScan = () => {
    setShowQRScanner(true);
    setIsScanning(false);
    
    // Request camera permission
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } 
    })
      .then(stream => {
        setQrCameraStream(stream);
        if (qrVideoRef.current) {
          qrVideoRef.current.srcObject = stream;
          qrVideoRef.current.play().catch(err => {
            console.error('Error playing video:', err);
          });
        }
      })
      .catch(error => {
        console.error('Camera permission error:', error);
        setShowQRScanner(false);
        
        if (error.name === 'NotAllowedError') {
          toast.error('Camera permission denied. Please allow camera access in your browser settings and try again.');
        } else if (error.name === 'NotFoundError') {
          toast.error('No camera found on this device');
        } else if (error.name === 'NotReadableError') {
          toast.error('Camera is already in use by another app');
        } else {
          toast.error('Failed to access camera. Please try pasting the URL instead.');
        }
        
        // Automatically show paste option after error
        setTimeout(() => {
          handleLinkedInPaste();
        }, 2000);
      });
  };

  const handleManualScan = async () => {
    if (!qrVideoRef.current || !qrCameraStream) {
      toast.error('Camera not ready. Please try again.');
      return;
    }

    setIsScanning(true);
    const codeReader = new BrowserQRCodeReader();
    
    try {
      const result = await codeReader.decodeOnceFromVideoElement(qrVideoRef.current);
      
      if (result && result.getText()) {
        const qrText = result.getText();
        console.log('QR Code scanned:', qrText);
        
        // LinkedIn QR codes contain the profile URL
        if (qrText.includes('linkedin.com')) {
          setLinkedInUrl(qrText);
          toast.success('LinkedIn QR scanned successfully');
          handleCloseQRScanner();
        } else {
          toast.error('Not a LinkedIn QR code. Please scan a LinkedIn QR code.');
          setIsScanning(false);
        }
      }
    } catch (error) {
      console.error('QR scan error:', error);
      toast.error('No QR code detected. Please try again.');
      setIsScanning(false);
    }
  };

  const startQRScanning = async () => {
    const codeReader = new BrowserQRCodeReader();
    
    try {
      const result = await codeReader.decodeOnceFromVideoElement(qrVideoRef.current!);
      
      if (result && result.getText()) {
        const qrText = result.getText();
        console.log('QR Code scanned:', qrText);
        
        // LinkedIn QR codes contain the profile URL
        if (qrText.includes('linkedin.com')) {
          setLinkedInUrl(qrText);
          toast.success('LinkedIn QR scanned successfully');
          handleCloseQRScanner();
        } else {
          toast.error('Not a LinkedIn QR code');
          // Continue scanning
          setTimeout(startQRScanning, 1000);
        }
      }
    } catch (error) {
      // Continue scanning if no QR code found yet
      if (qrVideoRef.current && qrCameraStream) {
        setTimeout(startQRScanning, 500);
      }
    }
  };

  const handleCloseQRScanner = () => {
    if (qrCameraStream) {
      qrCameraStream.getTracks().forEach(track => track.stop());
      setQrCameraStream(null);
    }
    setShowQRScanner(false);
  };

  const handleLinkedInPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.includes('linkedin.com')) {
        setLinkedInUrl(text);
        toast.success('LinkedIn URL pasted');
      } else {
        toast.error('No LinkedIn URL found in clipboard');
      }
    } catch (error) {
      toast.error('Failed to paste from clipboard');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setVoiceNoteBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSelfieUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataURL = e.target?.result as string;
      setPhotoUrl(dataURL);
      toast.success('Selfie uploaded');
    };
    reader.readAsDataURL(file);
  };

  const startSelfieCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      if (selfieInputRef.current) {
        selfieInputRef.current.srcObject = stream;
        selfieInputRef.current.play();
      }
      setShowSelfieCapture(true);
    } catch (error) {
      toast.error('Failed to access camera');
    }
  };

  const stopSelfieCapture = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setShowSelfieCapture(false);
    }
  };

  const captureSelfie = () => {
    if (selfieInputRef.current && canvasRef.current) {
      const video = selfieInputRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL('image/png');
        setPhotoUrl(dataURL);
        toast.success('Selfie captured');
      }
    }
  };

  if (!open) return null;

  if (showQRScanner) {
    return (
      <div className="fixed inset-0 bg-black z-50">
        <div className="relative h-full">
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <button
              onClick={handleCloseQRScanner}
              className="bg-zinc-900/80 backdrop-blur text-white rounded-lg px-4 py-2 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleCloseQRScanner();
                handleLinkedInPaste();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-medium transition-colors"
            >
              Paste URL instead
            </button>
          </div>
          
          {qrCameraStream ? (
            <div className="h-full flex flex-col items-center justify-center p-4 pt-20 pb-8">
              <div className="relative w-full max-w-lg">
                <video
                  ref={qrVideoRef}
                  className="w-full aspect-square object-cover rounded-lg bg-black"
                  autoPlay
                  playsInline
                  muted
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-72 h-72 border-4 border-green-500 rounded-xl" style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)' }} />
                </div>
              </div>
              <div className="mt-6 mb-4 text-center">
                <p className="text-white text-base font-medium mb-1">Point at LinkedIn QR code</p>
                <p className="text-zinc-400 text-sm">Align QR code within the frame</p>
              </div>
              <button
                onClick={handleManualScan}
                disabled={isScanning}
                className={`w-full max-w-lg px-6 py-3 rounded-lg font-semibold transition-colors ${
                  isScanning 
                    ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isScanning ? 'Scanning...' : 'Scan'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8 bg-zinc-900/80 backdrop-blur rounded-lg">
                <QrCode className="w-16 h-16 text-zinc-500 mx-auto mb-4 animate-pulse" />
                <p className="text-zinc-300 mb-2 font-medium">Requesting camera access...</p>
                <p className="text-sm text-zinc-500">
                  Please allow camera permission when prompted
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-zinc-900 w-full sm:max-w-md sm:rounded-lg rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">
            {screen === 'essentials' ? 'Quick Meet' : 'Add Details'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Screen A - Essentials */}
        {screen === 'essentials' && (
          <>
            <div className="p-4 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Who did you meet? *
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name (or 'Unknown')"
                  autoFocus
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="context" className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Context (optional)
                </label>
                <input
                  id="context"
                  type="text"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Met at... talked about..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Next step
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {nextStepOptions.map(option => (
                    <button
                      key={option.type}
                      onClick={() => setNextStepType(option.type)}
                      className={`p-3 rounded-lg border-2 transition-colors text-left ${
                        nextStepType === option.type
                          ? 'bg-blue-950 border-blue-500 text-blue-100'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {nextStepType !== 'none' && (
                  <div className="mt-3">
                    <label htmlFor="followup-date" className="block text-sm text-zinc-400 mb-1.5">
                      Follow-up date (optional)
                    </label>
                    <input
                      id="followup-date"
                      type="date"
                      value={customFollowUpDate}
                      onChange={(e) => setCustomFollowUpDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-4 flex gap-3">
              <button
                onClick={handleSaveEssentials}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleContinueToExtras}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg px-4 py-3 transition-colors"
                aria-label="Add more details"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </>
        )}

        {/* Screen B - Extras */}
        {screen === 'extras' && (
          <>
            <div className="p-4 space-y-4">
              {/* LinkedIn */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  LinkedIn
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleLinkedInScan}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    Scan QR
                  </button>
                  <button
                    onClick={handleLinkedInPaste}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                    Paste URL
                  </button>
                </div>
                {linkedInUrl && (
                  <p className="text-xs text-green-400 mt-2">✓ LinkedIn saved</p>
                )}
              </div>

              {/* Voice Note */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Voice note
                </label>
                {!voiceNoteBlob && !isRecording && (
                  <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className="w-full border-2 border-dashed rounded-lg py-4 flex flex-col items-center justify-center gap-2 transition-colors bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600"
                  >
                    <Mic className="w-6 h-6" />
                    <span className="text-sm">Hold to record</span>
                  </button>
                )}
                {isRecording && (
                  <div className="space-y-2">
                    <div className="w-full border-2 border-dashed rounded-lg py-4 flex flex-col items-center justify-center gap-2 bg-red-950 border-red-500 text-red-100">
                      <Mic className="w-6 h-6 animate-pulse" />
                      <span className="text-sm">Recording...</span>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-2.5 font-medium transition-colors"
                    >
                      Stop Recording
                    </button>
                  </div>
                )}
                {voiceNoteBlob && !isRecording && (
                  <div className="space-y-2">
                    <div className="w-full border-2 border-dashed rounded-lg py-4 flex flex-col items-center justify-center gap-2 bg-green-950 border-green-500 text-green-100">
                      <Mic className="w-6 h-6" />
                      <span className="text-sm">Recorded ✓</span>
                    </div>
                    <button
                      onClick={() => setVoiceNoteBlob(null)}
                      className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-2 text-sm transition-colors"
                    >
                      Record Again
                    </button>
                  </div>
                )}
              </div>

              {/* Event Link */}
              {events.length > 0 && (
                <div>
                  <label htmlFor="event" className="block text-sm font-medium text-zinc-300 mb-2">
                    Link to event
                  </label>
                  <select
                    id="event"
                    value={selectedEventId ?? ''}
                    onChange={(e) => setSelectedEventId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No event</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Promise */}
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={addPromise}
                    onChange={(e) => setAddPromise(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium text-zinc-300">Add a promise</span>
                </label>
                {addPromise && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={promiseText}
                      onChange={(e) => setPromiseText(e.target.value)}
                      placeholder="I promised to..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <label htmlFor="promise-date" className="block text-sm text-zinc-400 mb-1.5">
                        Due date (optional)
                      </label>
                      <input
                        id="promise-date"
                        type="date"
                        value={promiseDueDate}
                        onChange={(e) => setPromiseDueDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Selfie */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Selfie
                </label>
                <input
                  ref={selfieInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSelfieUpload}
                  className="hidden"
                />
                <button
                  onClick={() => selfieInputRef.current?.click()}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  {photoUrl ? 'Change Selfie' : 'Upload Selfie'}
                </button>
                {photoUrl && (
                  <div className="mt-2">
                    <img src={photoUrl} alt="Selfie preview" className="w-full h-auto rounded-lg" />
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-4 flex gap-3">
              <button
                onClick={() => setScreen('essentials')}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg px-4 py-3 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSaveExtras}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}