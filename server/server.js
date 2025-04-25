require('dotenv').config();
const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@deepgram/sdk');
const PDFDocument = require('pdfkit');
const formatter = require('./formatter.js');
const formatearUniversal = formatter.formatearUniversal;

console.log("formatearUniversal cargado:", typeof formatearUniversal);

const app = express();
const PORT = process.env.PORT || 3000;

let archivosAudioProcesados = [];

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/mp3', express.static(path.join(__dirname, '../temp')));

// === Herramientas locales (modo desarrollo forzado) ===
const ytDlpPath = path.join(__dirname, '../Tools/yt-dlp/yt-dlp.exe');
const ffmpegPath = path.join(__dirname, '../Tools/ffmpeg/ffmpeg.exe');

const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

function limpiarArchivosAnteriores(exceptoNombre = null) {
    fs.readdir(tempDir, (err, files) => {
        if (err) return console.error('Error al leer el directorio temporal:', err);

        const audioFiles = files.filter(file => file.endsWith('.mp3'));
        audioFiles.forEach(file => {
            if (!exceptoNombre || file !== exceptoNombre) {
                fs.unlink(path.join(tempDir, file), err => {
                    if (!err) console.log(`Archivo eliminado: ${file}`);
                });
            }
        });
    });
}

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

if (!process.env.DEEPGRAM_API_KEY) {
    console.error("No se encontró DEEPGRAM_API_KEY en el archivo .env");
    process.exit(1);
}

// === Descargar MP3 ===
app.post('/descargar-mp3', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL no proporcionada' });

    const idUnico = crypto.randomUUID().slice(0, 8);
    const outputFile = path.join(tempDir, `${idUnico}.mp3`);
    limpiarArchivosAnteriores();

    const command = `"${ytDlpPath}" -f bestaudio --extract-audio --audio-format mp3 --ffmpeg-location "${path.dirname(ffmpegPath)}" -o "${outputFile}" "${url}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: 'Error al descargar el audio' });

        const nombreArchivo = path.basename(outputFile);
        archivosAudioProcesados.push(nombreArchivo);

        res.json({
            mensaje: 'Audio descargado con éxito',
            archivo: nombreArchivo,
            ruta: `/mp3/${nombreArchivo}`
        });
    });
});

// === Transcripción ===
app.post('/transcribir', async (req, res) => {
    const { url, idioma = 'auto' } = req.body;
    if (!url) return res.status(400).json({ error: 'URL no proporcionada' });

    const idUnico = crypto.randomUUID().slice(0, 8);
    const outputFile = path.join(tempDir, `${idUnico}.mp3`);
    limpiarArchivosAnteriores();

    const command = `"${ytDlpPath}" -f bestaudio --extract-audio --audio-format mp3 --ffmpeg-location "${path.dirname(ffmpegPath)}" -o "${outputFile}" "${url}"`;

    exec(command, async (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: 'Error al descargar el audio' });

        try {
            const nombreArchivo = path.basename(outputFile);
            archivosAudioProcesados.push(nombreArchivo);

            const fileBuffer = fs.readFileSync(outputFile);
            
            const deepgramOptions = {
                model: 'nova',
                smart_format: true,
                detect_language: true
            };
            
            if (idioma !== 'auto') {
                deepgramOptions.language = idioma;
            }

            const response = await deepgram.listen.prerecorded.transcribeFile(fileBuffer, deepgramOptions);

            const results = response.result?.results;
            let transcript = results?.channels?.[0]?.alternatives?.[0]?.transcript;
            const idiomaDetectado = response.result?.metadata?.detected_language || 'es';

            if (!transcript) return res.status(500).json({ error: 'Transcripción vacía' });

            // Aplicar formato universal
            const formateado = formatearUniversal(transcript, idioma === 'auto' ? idiomaDetectado : idioma);

            let mensaje;
            if (idiomaDetectado === 'en') {
                mensaje = 'Transcription completed successfully';
            } else {
                mensaje = 'Transcripción completada con éxito';
            }
            
            res.json({
                transcripcion: formateado,
                nombreArchivo: path.basename(outputFile, '.mp3'),
                idioma: idiomaDetectado,
                mensaje: mensaje
            });

        } catch (error) {
            console.error("Error al transcribir:", error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error al transcribir el audio' });
            }
        }
    });
});

// === Exportar PDF ===
app.post('/descargar/pdf', (req, res) => {
    try {
        const { texto, nombreArchivo, idioma = 'es', tamanoFuente } = req.body;

        if (!texto || !nombreArchivo) {
            return res.status(400).json({ error: 'Faltan datos obligatorios.' });
        }

        // Configurar cabeceras primero
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.pdf"`);

        // Crear PDF
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        doc.pipe(res);

        const fontSize = parseInt(tamanoFuente) || 12;

        // Contenido del PDF
        doc.font('Times-Roman')
           .fontSize(fontSize + 4)
           .fillColor('#003366')
           .text(`Transcripción: ${nombreArchivo}`, { align: 'center', underline: true });
        doc.moveDown(1.5);

        const textoFormateado = formatearUniversal(texto, idioma);
        
        // Procesar el texto para manejar correctamente títulos y párrafos
        const lineas = textoFormateado.split('\n');
        
        doc.font('Times-Roman');
        
        for (let i = 0; i < lineas.length; i++) {
            const linea = lineas[i];
            
            // Detectar títulos y subtítulos (líneas que comienzan con #)
            if (linea.trim().startsWith('#')) {
                // Contar el número de # para determinar el nivel del título
                const nivelTitulo = linea.match(/^#+/)[0].length;
                const textoTitulo = linea.replace(/^#+\s*/, '');
                
                // Añadir espacio antes del título si no es el primer elemento
                if (i > 0) {
                    doc.moveDown(1);
                }
                
                // Aplicar formato según nivel
                switch (nivelTitulo) {
                    case 1: // Título principal
                        doc.fontSize(fontSize + 4)
                           .fillColor('#003366')
                           .text(textoTitulo, { continued: false });
                        break;
                    case 2: // Subtítulo
                        doc.fontSize(fontSize + 2)
                           .fillColor('#004080')
                           .text(textoTitulo, { continued: false });
                        break;
                    case 3: // Sub-subtítulo
                        doc.fontSize(fontSize + 1)
                           .fillColor('#004f99')
                           .text(textoTitulo, { continued: false });
                        break;
                    default: // Otros niveles
                        doc.fontSize(fontSize)
                           .fillColor('#005599')
                           .text(textoTitulo, { continued: false });
                }
                
                // Espacio después del título
                doc.moveDown(0.5);
                
                // Restaurar fuente para el texto normal
                doc.fontSize(fontSize).fillColor('black');
            } else {
                // Texto normal
                if (linea.trim() !== '') {
                    doc.text(linea, {
                        align: 'justify',
                        continued: false
                    });
                    
                    // Si la línea no está vacía y no es la última, añadir un pequeño espacio
                    if (i < lineas.length - 1 && lineas[i+1].trim() !== '' && !lineas[i+1].startsWith('#')) {
                        doc.moveDown(0.2);
                    } else {
                        doc.moveDown(1);
                    }
                } else if (i < lineas.length - 1) {
                    // Línea vacía indica separación de párrafo
                    doc.moveDown(1);
                }
            }
        }

        doc.end();

        // Manejo de errores
        doc.on('error', (err) => {
            console.error('Error al generar PDF:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error al generar el PDF' });
            }
        });

    } catch (error) {
        console.error('Error en el proceso de PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error interno al generar PDF.' });
        }
    }
});

// === Estado ===
app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        entorno: 'solo localhost',
        archivosProcesados: archivosAudioProcesados.length,
        idiomasSoportados: ['es', 'en']
    });
});

// === Iniciar servidor en localhost:3000 ===
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Idiomas soportados: español (es), inglés (en)`);
});

// === Limpiar archivos temporales al cerrar ===
process.on('SIGINT', () => {
    console.log('\nCerrando servidor... Eliminando archivos temporales...');
    fs.readdir(tempDir, (err, files) => {
        if (err) return;
        files.forEach(file => {
            fs.unlinkSync(path.join(tempDir, file));
        });
        process.exit();
    });
});