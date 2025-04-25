document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.querySelector('.url-input');
    const processBtn = document.getElementById('url-btn');
    const transcriptContent = document.querySelector('.transcript-content');
    const exportPDFBtn = document.querySelector('.transcript-actions button:nth-child(1)');
    const copyTextBtn = document.querySelector('.transcript-actions button:nth-child(2)');
    const exportTXTBtn = document.createElement('button');
    const exportMP3Btn = document.createElement('button');

    // Crear botones
    exportTXTBtn.className = 'btn';
    exportTXTBtn.textContent = 'Exportar TXT';
    exportMP3Btn.className = 'btn';
    exportMP3Btn.textContent = 'Descargar MP3';

    const transcriptActions = document.querySelector('.transcript-actions');
    transcriptActions.insertBefore(exportTXTBtn, transcriptActions.children[1]);

    let currentTranscript = '';
    let currentFileName = '';
    let currentAudioFile = '';
    let currentLanguage = 'es';

    processBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) return alert('Por favor, ingrese una URL válida.');

        transcriptContent.innerHTML = `<p><em>Procesando...</em></p>`;

        try {
            const response = await fetch('/transcribir', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (data.error) {
                transcriptContent.innerHTML = `<p style="color:red;">Error: ${data.error}</p>`;
            } else {
                currentTranscript = data.transcripcion;
                currentAudioFile = data.archivo || '';
                currentFileName = generarNombreArchivo(url);
                currentLanguage = data.idioma || 'es';  // Guarda el idioma detectado
                transcriptContent.innerHTML = `<p>${formatearTexto(currentTranscript)}</p>`;
            }
        } catch (err) {
            transcriptContent.innerHTML = `<p style="color:red;">Error en el servidor.</p>`;
            console.error(err);
        }
    });

    // Copiar texto al portapapeles
    copyTextBtn.addEventListener('click', () => {
        if (!currentTranscript) {
            return alert('No hay transcripción para copiar.');
        }

        // Crear un elemento temporal para copiar el texto
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = currentTranscript;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        
        try {
            // Ejecutar el comando de copia
            const successful = document.execCommand('copy');
            if (successful) {
                // Mostrar notificación de éxito
                const originalText = copyTextBtn.textContent;
                copyTextBtn.textContent = '¡Copiado!';
                
                // Restaurar el texto original después de 2 segundos
                setTimeout(() => {
                    copyTextBtn.textContent = originalText;
                }, 2000);
            } else {
                alert('No se pudo copiar el texto');
            }
        } catch (err) {
            console.error('Error al copiar:', err);
            alert('Error al copiar el texto');
        } finally {
            // Eliminar el elemento temporal
            document.body.removeChild(tempTextArea);
        }
    });

    // Descargar .txt
    exportTXTBtn.addEventListener('click', () => {
        if (!currentTranscript) return alert('No hay transcripción para exportar.');
        const blob = new Blob([currentTranscript], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${currentFileName}.txt`;
        link.click();
    });
    
    // Descargar .pdf desde el servidor
    exportPDFBtn.addEventListener('click', async () => {
        if (!currentTranscript) return alert('No hay transcripción para exportar.');

        const textSize = document.getElementById('text-size').value;
    
        try {
            const response = await fetch('/descargar/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    texto: currentTranscript,
                    nombreArchivo: currentFileName,
                    tamanoFuente: textSize,
                    idioma: currentLanguage  // Usa el idioma guardado
                })
            });

            // Verificar si la respuesta es un PDF
            const contentType = response.headers.get('content-type');
            if (!response.ok || !contentType.includes('application/pdf')) {
                const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(error.error || 'Error al generar el PDF');
            }

            // Crear enlace de descarga directa
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentFileName}.pdf`;
            document.body.appendChild(a);
            a.click();
            
            // Limpieza
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (err) {
            console.error('Error al generar PDF:', err);
            alert(err.message || 'Error al generar el PDF');
        }
    });

    // Descargar MP3
    exportMP3Btn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) return alert('Por favor, ingrese una URL válida.');

        try {
            const response = await fetch('/descargar-mp3', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (data.archivo && data.ruta) {
                const link = document.createElement('a');
                link.href = data.ruta;
                link.download = data.archivo;
                link.click();
            } else {
                alert('Error al descargar el MP3');
            }
        } catch (error) {
            console.error('Error al realizar la petición:', error);
            alert('Error al descargar el MP3.');
        }
    });

    function formatearTexto(texto) {
        return texto
            .replace(/\.\s+/g, '.\n\n') // separa por párrafos
            .replace(/([A-Z][a-z]+)/g, '$1') // conserva mayúsculas
            .trim();
    }

    function generarNombreArchivo(url) {
        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname.split('/').filter(Boolean);
            return (path[path.length - 1] || 'transcripcion').slice(0, 40);
        } catch {
            return 'transcripcion';
        }
    }
});