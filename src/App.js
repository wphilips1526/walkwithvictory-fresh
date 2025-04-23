import React, { useState, useEffect, Component } from 'react';
import axios from 'axios';
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Error Boundary Component
class ErrorBoundary extends Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div>
                    <h1>Something went wrong.</h1>
                    <p>{this.state.error?.message || 'Unknown error'}</p>
                </div>
            );
        }
        return this.props.children;
    }
}

function App() {
    const [files, setFiles] = useState([]);
    const [error, setError] = useState(null);
    const [sermonText, setSermonText] = useState('');
    const [convertedSermon, setConvertedSermon] = useState(null);
    const [sermonError, setSermonError] = useState(null);
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaUrl, setMediaUrl] = useState(null);
    const [uploadMessage, setUploadMessage] = useState(null);
    const [devotional, setDevotional] = useState(null);
    const [devotionalError, setDevotionalError] = useState(null);

    useEffect(() => {
        axios.get('http://192.168.1.21:5000/files')
            .then(response => {
                setFiles(response.data);
                setError(null);
            })
            .catch(error => {
                console.error('Error fetching files:', error);
                setError('Failed to load files. Please try again later.');
            });
    }, []);

    const handleConvertSermon = async () => {
        try {
            const response = await axios.post('http://192.168.1.21:5000/convert-sermon', { sermonText });
            setConvertedSermon(response.data.convertedSermon);
            setSermonError(null);
        } catch (error) {
            console.error('Error converting sermon:', error);
            setSermonError('Failed to convert sermon. Please try again.');
        }
    };

    const handleMediaUpload = async () => {
        if (!mediaFile) return;
        try {
            const storageRef = ref(storage, `media/${mediaFile.name}`);
            await uploadBytes(storageRef, mediaFile);
            const url = await getDownloadURL(storageRef);
            setMediaUrl(url);
            setUploadMessage('Media uploaded successfully!');
        } catch (error) {
            console.error('Error uploading media:', error);
            setUploadMessage('Media upload failed. Please try again.');
        }
    };

    const handleGenerateEbook = async () => {
        if (!convertedSermon) return;
        try {
            const response = await axios.post('http://192.168.1.21:5000/generate-ebook', { content: convertedSermon });
            const link = document.createElement('a');
            link.href = `data:application/pdf;base64,${response.data.pdfBase64}`;
            link.download = 'sermon-ebook.pdf';
            link.click();
        } catch (error) {
            console.error('Error generating eBook:', error);
        }
    };

    const handleGenerateDevotional = async () => {
        if (!convertedSermon) return;
        try {
            const response = await axios.post('http://192.168.1.21:5000/generate-devotional', { content: convertedSermon });
            setDevotional(response.data.devotional);
            setDevotionalError(null);
        } catch (error) {
            console.error('Error generating devotional:', error);
            setDevotionalError('Failed to generate devotional. Please try again.');
        }
    };

    const handleShare = (platform) => {
        const shareText = devotional 
            ? `${devotional.title}\n${devotional.reflection}\n${devotional.prayer}`
            : convertedSermon 
            ? convertedSermon
            : 'Check out this content from Walk With Victory!';
        const shareUrl = mediaUrl || 'https://main.d2wg7ezilmjcad.amplifyapp.com/';

        let shareLink;
        switch (platform) {
            case 'facebook':
                shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}"e=${encodeURIComponent(shareText)}`;
                break;
            case 'truthsocial':
                shareLink = `https://truthsocial.com/share?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;
                break;
            default:
                return;
        }
        window.open(shareLink, '_blank');
    };

    return (
        <ErrorBoundary>
            <div>
                <h1>Walk With Victory</h1>
                {error ? (
                    <p style={{ color: 'red' }}>{error}</p>
                ) : (
                    <>
                        <h2>File List</h2>
                        {files.length > 0 ? (
                            <ul>
                                {files.map(file => (
                                    <li key={file.id}>{file.name}</li>
                                ))}
                            </ul>
                        ) : (
                            <p>Loading files...</p>
                        )}
                    </>
                )}
                <h2>Upload Video or Audio</h2>
                <input
                    type="file"
                    accept="video/*,audio/*"
                    onChange={(e) => setMediaFile(e.target.files[0])}
                />
                <button onClick={handleMediaUpload}>Upload Media</button>
                {uploadMessage && <p>{uploadMessage}</p>}
                {mediaUrl && (
                    <div>
                        <p>Media uploaded: <a href={mediaUrl} target="_blank">View Media</a></p>
                    </div>
                )}
                <h2>Convert a Sermon</h2>
                <textarea
                    value={sermonText}
                    onChange={(e) => setSermonText(e.target.value)}
                    placeholder="Enter sermon text here"
                    rows="5"
                    cols="50"
                />
                <br />
                <button onClick={handleConvertSermon}>Convert Sermon</button>
                {sermonError && <p style={{ color: 'red' }}>{sermonError}</p>}
                {convertedSermon && (
                    <div>
                        <h3>Converted Sermon:</h3>
                        <p>{convertedSermon}</p>
                        <button onClick={handleGenerateEbook}>Generate eBook (PDF)</button>
                        <button onClick={handleGenerateDevotional}>Generate Devotional</button>
                    </div>
                )}
                {devotional && (
                    <div>
                        <h3>{devotional.title}</h3>
                        <p><strong>Reflection:</strong> {devotional.reflection}</p>
                        <p><strong>Prayer:</strong> {devotional.prayer}</p>
                        <h4>Share this Devotional:</h4>
                        <button onClick={() => handleShare('facebook')}>Share on Facebook</button>
                        <button onClick={() => handleShare('truthsocial')}>Share on Truth Social</button>
                    </div>
                )}
                {devotionalError && <p style={{ color: 'red' }}>{devotionalError}</p>}
            </div>
        </ErrorBoundary>
    );
}

export default App;
