import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import 'dotenv/config';

const app=express();
app.use(cors({origin:true}));
app.use(express.json());
const pool=mysql.createPool(process.env.MYSQL_PRIVATE_URL||process.env.DATABASE_URL);
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024}});
const JWT_SECRET=process.env.JWT_SECRET;
if(!JWT_SECRET) console.warn('JWT_SECRET is not set');
function auth(req,res,next){try{const h=req.headers.authorization||'';req.user=jwt.verify(h.replace(/^Bearer /,''),JWT_SECRET);next()}catch{res.status(401).json({error:'Unauthorized'})}}

app.get('/api/health',(req,res)=>res.json({ok:true,service:'isoko-admin-api'}));

app.post('/api/auth/setup',async(req,res)=>{try{
 const {email,password}=req.body;
 if(!email||!password||password.length<8)return res.status(400).json({error:'Email and password (8+ chars) required'});
 const [rows]=await pool.query('SELECT COUNT(*) c FROM admins');
 if(rows[0].c>0)return res.status(409).json({error:'Owner account already exists'});
 const hash=await bcrypt.hash(password,12);
 await pool.query('INSERT INTO admins(email,password_hash) VALUES(?,?)',[email.toLowerCase(),hash]);
 res.json({ok:true});
}catch(e){res.status(500).json({error:e.message})}});

app.post('/api/auth/login',async(req,res)=>{try{
 const [rows]=await pool.query('SELECT id,email,password_hash FROM admins WHERE email=?',[String(req.body.email||'').toLowerCase()]);
 if(!rows[0]||!(await bcrypt.compare(req.body.password||'',rows[0].password_hash)))return res.status(401).json({error:'Invalid login'});
 res.json({token:jwt.sign({id:rows[0].id,email:rows[0].email},JWT_SECRET,{expiresIn:'12h'})});
}catch(e){res.status(500).json({error:e.message})}});

app.get('/api/settings',async(req,res)=>{const [rows]=await pool.query('SELECT * FROM site_settings WHERE id=1');res.json(rows[0]||{})});
app.put('/api/settings',auth,async(req,res)=>{const {phone,hours,address,instagram}=req.body;await pool.query('UPDATE site_settings SET phone=?,hours=?,address=?,instagram=? WHERE id=1',[phone,hours,address,instagram]);res.json({ok:true})});

app.get('/api/menu',async(req,res)=>{const [rows]=await pool.query('SELECT id,category,name,price_rwf,sort_order FROM menu_items ORDER BY category,sort_order,name');res.json(rows)});
app.post('/api/menu',auth,async(req,res)=>{const {category,name,price_rwf,sort_order=0}=req.body;const [r]=await pool.query('INSERT INTO menu_items(category,name,price_rwf,sort_order) VALUES(?,?,?,?)',[category,name,Number(price_rwf),Number(sort_order)]);res.json({id:r.insertId})});
app.put('/api/menu/:id',auth,async(req,res)=>{const {category,name,price_rwf,sort_order=0}=req.body;await pool.query('UPDATE menu_items SET category=?,name=?,price_rwf=?,sort_order=? WHERE id=?',[category,name,Number(price_rwf),Number(sort_order),req.params.id]);res.json({ok:true})});
app.delete('/api/menu/:id',auth,async(req,res)=>{await pool.query('DELETE FROM menu_items WHERE id=?',[req.params.id]);res.json({ok:true})});

app.get('/api/gallery',async(req,res)=>{const [rows]=await pool.query('SELECT id,filename,caption,mime_type,created_at FROM gallery ORDER BY created_at DESC');res.json(rows)});
app.get('/api/gallery/:id/image',async(req,res)=>{const [rows]=await pool.query('SELECT mime_type,image_data FROM gallery WHERE id=?',[req.params.id]);if(!rows[0])return res.sendStatus(404);res.set('Content-Type',rows[0].mime_type);res.send(rows[0].image_data)});
app.post('/api/gallery',auth,upload.single('photo'),async(req,res)=>{if(!req.file)return res.status(400).json({error:'Photo required'});const [r]=await pool.query('INSERT INTO gallery(filename,caption,mime_type,image_data) VALUES(?,?,?,?)',[req.file.originalname,req.body.caption||'',req.file.mimetype,req.file.buffer]);res.json({id:r.insertId})});
app.delete('/api/gallery/:id',auth,async(req,res)=>{await pool.query('DELETE FROM gallery WHERE id=?',[req.params.id]);res.json({ok:true})});

const port=process.env.PORT||3000;
app.listen(port,()=>console.log('Isoko API listening on '+port));