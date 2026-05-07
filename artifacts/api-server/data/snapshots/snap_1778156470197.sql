--
-- PostgreSQL database dump
--

\restrict 5DtKk5gJgeh67hkfiZhETLmDLvO8ksk9PSsjDy3D2paX8aE6Yb05o2RK6QSDjCT

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: bingo_words; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bingo_words (id, word, regions, surroundings, day_night, age, findability, seasons, boards, notes, created_at, updated_at, spanish, emoji) FROM stdin;
175	Bee	{All}	{"Rural / Xurban","Suburban / Town"}	{Day}	Young	Low	{Spring,Summer}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Abeja	🐝
178	Beetle	{All}	{"Rural / Xurban","Suburban / Town",Coast}	{Day}	Kid	Low	{Spring,Summer}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Escarabajo	🪲
167	Bird	{All}	{All}	{Day}	Young	High	{All}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Pájaro	🐦
162	Bush	{All}	{All}	{Day,Night}	Young	High	{All}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Arbusto	🌿
174	Butterfly or Moth	{All}	{"Rural / Xurban","Suburban / Town"}	{Day}	Young	Low	{Spring,Summer}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Mariposa o polilla	🦋
163	Cactus	{"SW + HI","S Cent"}	{All}	{Day,Night}	Young	High	{All}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Cactus	🌵
171	Cat	{All}	{"Rural / Xurban","Suburban / Town","Urban / City",Coast}	{Day}	Young	Low	{All}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Gato	🐱
187	Church	{All}	{"Urban / City","Rural / Xurban","Suburban / Town"}	{Day}	Young	High	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Iglesia	⛪
168	Cow	{NE,"N Cent","NW + AK"}	{"Rural / Xurban"}	{Day}	Young	Medium	{All}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Vaca	🐄
172	Deer	{NE,"NW + AK"}	{"Rural / Xurban",Highway}	{Day}	Kid	Low	{All}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Venado	🦌
170	Dog	{All}	{All}	{Day}	Young	Medium	{All}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Perro	🐶
185	Factory	{All}	{"Urban / City","Suburban / Town"}	{Day}	Tween	Low	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Fábrica	🏭
173	Fish	{All}	{"Rural / Xurban","Suburban / Town"}	{Day}	Kid	Low	{Spring,Summer,Fall}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Pez	🐟
161	Flower	{All}	{All}	{Day}	Young	High	{Spring,Summer}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Flor	🌸
177	Fly	{All}	{"Urban / City","Rural / Xurban","Suburban / Town",Coast}	{Day}	Kid	Medium	{Spring,Summer,Fall}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Mosca	🪰
169	Horse	{All}	{"Rural / Xurban"}	{Day}	Young	Medium	{All}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Caballo	🐎
184	Hospital	{All}	{"Urban / City","Rural / Xurban","Suburban / Town"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Hospital	🏥
188	House of Worship	{All}	{All}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Lugar de culto	🕍
183	Library	{All}	{"Urban / City","Rural / Xurban","Suburban / Town"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Biblioteca	📚
181	Mall	{All}	{All}	{Day,Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Centro comercial	🛍️
182	School	{All}	{"Urban / City","Rural / Xurban","Suburban / Town",Shoreline}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Escuela	🏫
160	Tree	{All}	{All}	{Day,Night}	Young	High	{All}	{General,"Flora & Fauna",Sounds}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Árbol	🌳
164	Vine	{All}	{All}	{Day}	Kid	High	{All}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Enredadera	🌿
186	Warehouse	{All}	{"Urban / City",Highway,"Rural / Xurban","Suburban / Town"}	{Day}	Tween	Medium	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Bodega	🏭
180	Wasp	{All}	{"Rural / Xurban","Suburban / Town"}	{Day}	Kid	Low	{Spring,Summer}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Avispa	🐝
166	Wheat	{NE,"N Cent"}	{"Rural / Xurban",Highway}	{Day}	Kid	Medium	{Summer}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Trigo	🌾
207	Canal	{NE}	{"Rural / Xurban","Suburban / Town"}	{Day}	Tween	Low	{All}	{General}	Meh	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Canal	🚣
195	Cloud	{All}	{All}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Nube	☁️
206	Ditch	{All}	{Highway,"Rural / Xurban"}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Zanja	🕳️
217	Dog in Car	{All}	{All}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Perro en auto	🐶
212	Esturary	{NE,SE,"NW + AK"}	{Coast}	{Day}	Tween	Low	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Estuario	🌊
219	Farm	{All}	{"Rural / Xurban"}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Granja	🚜
218	Farmhouse	{All}	{"Rural / Xurban"}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Casa de campo	🏡
201	Fog	{NE,"N Cent","NW + AK"}	{All,Coast}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Niebla	🌫️
211	Harbor	{All}	{Coast}	{Day}	Tween	High	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Puerto	⚓
190	Hill	{All}	{All}	{Day}	Young	High	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Colina	⛰️
210	Lake	{NE,"N Cent","NW + AK",SE,"S Cent"}	{All}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Lago	🏞️
203	Lightning	{All}	{All}	{Day,Night}	Kid	Low	{All}	{General,Chaos}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Relámpago	⚡
214	Marina	{All}	{All}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Marina	⚓
193	Moon	{All}	{All}	{Night}	Young	Medium	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Luna	🌙
191	Mountain	{NE,"N Cent","NW + AK"}	{"Rural / Xurban","Suburban / Town",Highway}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Montaña	⛰️
213	Ocean	{NE,SE,"NW + AK","SW + HI"}	{Coast}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Océano	🌊
192	Playground	{All}	{"Urban / City","Rural / Xurban","Suburban / Town"}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Área de juegos	🛝
202	Puddle	{NE,SE,"N Cent","NW + AK"}	{All}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Charco	💧
196	Rain	{NE,"N Cent","NW + AK",SE}	{All}	{Day,Night}	Young	Low	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Lluvia	🌧️
197	Rainbow	{NE,"N Cent","NW + AK"}	{All}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Arcoíris	🌈
221	Ranch	{"SW + HI"}	{"Rural / Xurban"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Rancho	🤠
209	River	{All}	{All}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Río	🏞️
216	Roadkill	{All}	{All}	{Day}	Tween	Medium	{All}	{Chaos}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Animal atropellado	🦌
199	Snow	{NE,"N Cent","NW + AK"}	{All}	{Day,Night}	Kid	Low	{Winter}	{General,Christmas}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Nieve	❄️
194	Star	{All}	{"Rural / Xurban",Coast,Highway}	{Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Estrella	⭐
208	Stream	{All}	{Highway,"Rural / Xurban","Suburban / Town"}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Arroyo	💧
198	Sunbeam	{All}	{All}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Rayo de sol	☀️
204	Thunder	{All}	{All}	{Day,Night}	Kid	Low	{All}	{General,Sounds,Chaos}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Trueno	⛈️
200	Wind	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Viento	💨
227	Barn	{All}	{"Rural / Xurban",Highway}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Granero	🏚️
232	Burger Joint	{All}	{Highway,"Urban / City","Suburban / Town"}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Hamburguesería	🍔
243	Canoe	{All}	{"Rural / Xurban"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Canoa	🛶
238	Chinese Restaurant	{All}	{"Urban / City","Suburban / Town"}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Restaurante chino	🥡
223	Combine	{All}	{"Rural / Xurban"}	{Day}	Kid	Low	{Spring,Summer,Fall}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Cosechadora	🚜
245	Cruise Ship	{All}	{Coast}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Crucero	🛳️
244	Ferry	{All}	{"Urban / City","Rural / Xurban",Coast}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Ferri	⛴️
251	Gas Pump	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Bomba de gasolina	⛽
234	Ice Cream Stand	{All}	{"Urban / City","Suburban / Town",Coast}	{Day}	Young	Medium	{Spring,Summer,Fall}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Puesto de helados	🍦
224	Irrigation	{All}	{"Rural / Xurban","Suburban / Town"}	{Day}	Kid	Low	{Spring,Summer}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Irrigación	💧
237	Italian Restaurant	{All}	{"Urban / City","Suburban / Town"}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Restaurante italiano	🍝
246	Jet Ski	{All}	{"Rural / Xurban","Urban / City"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Moto acuática	🌊
236	Mexican Restaurant	{All}	{"Urban / City","Suburban / Town"}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Restaurante mexicano	🌮
252	Oil Pump	{"SW + HI","S Cent"}	{"Rural / Xurban"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Bomba petrolera	🛢️
233	Pizza Parlor	{All}	{Highway,"Urban / City","Suburban / Town"}	{Day}	Young	High	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Pizzería	🍕
222	Ranch house	{"SW + HI"}	{"Rural / Xurban"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Casa de rancho	🏡
242	Sail Boat	{All}	{Coast}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Velero	⛵
235	Sandwich Shop	{All}	{"Urban / City","Suburban / Town"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Tienda de sándwiches	🥪
241	Seafood Restaurant	{All}	{"Urban / City","Suburban / Town"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Restaurante de mariscos	🦞
225	Silo	{"N Cent",NE}	{"Rural / Xurban"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Silo	🌾
249	Solar Panels	{All}	{"Rural / Xurban","Suburban / Town"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Paneles solares	☀️
247	Speed Boat	{All}	{"Rural / Xurban","Suburban / Town","Urban / City",Coast}	{Day}	Young	Medium	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Lancha rápida	🚤
240	Sushi Resaurant	{All}	{"Urban / City","Suburban / Town"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Restaurante de sushi	🍣
228	Tractor	{All}	{"Rural / Xurban"}	{Day}	Kid	High	{Spring,Summer,Fall}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Tractor	🚜
230	Traffic cop	{All}	{"Urban / City"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Policía de tránsito	👮
229	Wide Load	{All}	{Highway}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Carga ancha	🚛
250	Wind Turbine	{All}	{"Suburban / Town","Rural / Xurban",Highway}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Turbina eólica	🌬️
256	Beach	{All}	{Coast,"Rural / Xurban",Highway}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Playa	🏖️
477	Cell phone tower	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Torre de telefonía celular	📡
429	Christmas lights	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Luces navideñas	🎄
260	Connecticut plate	{NE,SE,"N Cent"}	{All}	{Day}	Kid	Medium	{All}	{"License plate"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Placa de Connecticut	🚘
165	Corn	{NE,"N Cent","NW + AK",SE}	{"Rural / Xurban",Highway}	{Day}	Kid	Medium	{Summer,Fall}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Maíz	🌽
267	Delaware plate	{NE,SE}	{All}	{Day}	Kid	Low	{All}	{"License plate"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Placa de Delaware	🚘
231	Diner	{NE,"N Cent"}	{"Suburban / Town"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Restaurante tipo diner	🍽️
329	Dinosaur	{All}	{Highway,"Urban / City","Suburban / Town","Rural / Xurban"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Dinosaurio	🦖
270	District of Colombia plate	{NE,SE}	{All}	{Day}	Kid	Low	{All}	{"License plate"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Placa del Distrito de Columbia	🚘
255	Energy Plant	{All}	{"Rural / Xurban"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Planta de energía	🏭
480	Evergreen tree	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Árbol de hoja perenne	🌲
534	Far-away point of interest	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Punto de interés lejano	📍
259	Florida plate	{SE,NE,"S Cent"}	{All}	{Day}	Kid	Medium	{All}	{"License plate"}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Placa de Florida	🚘
557	Frost	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Escarcha	❄️
325	Garage	{All}	{"Urban / City","Suburban / Town"}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Garaje	🚗
253	Gas Line	{"SW + HI","S Cent"}	{"Rural / Xurban"}	{Day}	Kid	Low	{All}	{General}	Meh	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Tubería de gas	⛽
503	Goats or sheep	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Cabras u ovejas	🐐
401	Gravestone	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Lápida	🪦
266	Maine plate	{NE,"N Cent"}	{All}	{Day}	Kid	Medium	{All}	{"License plate"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Placa de Maine	🚘
269	Maryland plate	{NE,SE,"N Cent"}	{All}	{Day}	Kid	Medium	{All}	{"License plate"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Placa de Maryland	🚘
263	New Hampshire plate	{NE,"N Cent"}	{All}	{Day}	Kid	Medium	{All}	{"License plate"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Placa de New Hampshire	🚘
261	New Jersey plate	{NE,SE,"N Cent"}	{All}	{Day}	Kid	Medium	{All}	{"License plate"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Placa de New Jersey	🚘
258	New York plate	{NE,SE,"N Cent"}	{All}	{Day}	Kid	Medium	{All}	{"License plate"}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Placa de Nueva York	🚘
268	Ohio plate	{NE,SE,"N Cent"}	{All}	{Day}	Kid	Medium	{All}	{"License plate"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Placa de Ohio	🚘
254	Oil tanker	{NE,SE,"NW + AK","SW + HI"}	{Coast}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Camión cisterna	🚛
264	Pennsylvania plate	{NE,SE,"N Cent"}	{All}	{Day}	Kid	Medium	{All}	{"License plate"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Placa de Pennsylvania	🚘
265	Quebec plate	{NE,"N Cent"}	{All}	{Day}	Kid	Low	{All}	{"License plate"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Placa de Quebec	🚘
262	Vermont plate	{NE,"N Cent"}	{All}	{Day}	Kid	Medium	{All}	{"License plate"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Placa de Vermont	🚘
425	Grinch	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Grinch	💚
220	Hay bale	{"N Cent",NE}	{"Rural / Xurban"}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Paca de heno	🌾
541	License plate from another state	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Placa de otro estado	🚘
483	Mile marker	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Marcador de milla	📍
179	Mosquito	{All}	{"Rural / Xurban","Suburban / Town"}	{Day}	Kid	Low	{Spring,Summer}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Mosquito	🦟
349	No U-Turn	{All}	{Highway,"Urban / City","Suburban / Town"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	No vuelta en U	↩️
226	Oil pumps	{"S Cent","SW + HI"}	{Highway,"Rural / Xurban"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Bombas petroleras	🛢️
371	Open Flag	{All}	{All}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Bandera de abierto	🚩
515	Oversized load sign	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Señal de carga sobredimensionada	🪧
432	Oversized ornaments	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Adornos gigantes	🎄
564	Pinecone	{All}	{}	{}	\N	\N	{}	{"Nat Park - Yosemite"}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Piña de pino	🌲
365	Red Firetruck Lights	{All}	{"Rural / Xurban","Urban / City"}	{Day,Night}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Luces rojas de camión de bomberos	🚒
524	Revving engine noise	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Ruido de motor acelerando	🏎️
257	Roadside trash	{All}	{All}	{Day}	Kid	High	{All}	{Chaos}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Basura al lado de la carretera	🗑️
402	Skeleton animal	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	Medium	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Esqueleto de animal	🦴
316	Skyscraper	{All}	{"Urban / City"}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Rascacielos	🏙️
205	Slush	{NE,"N Cent","NW + AK"}	{All}	{Day}	Kid	Low	{Winter}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Aguanieve	🥶
470	Street sign with the starting letter of your name	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Señal de calle con la inicial de tu nombre	🪧
239	Thai Restaurant	{All}	{"Urban / City","Suburban / Town"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Restaurante tailandés	🍜
350	Traffic Light	{All}	{All}	{Day,Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Semáforo	🚦
537	Veterinarian office	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Veterinaria	🐾
444	Welcome sign	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Letrero de bienvenida	🪧
430	Wreath	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Corona	🎄
283	Bed & Breakfast	{All}	{"Suburban / Town","Rural / Xurban",Coast}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Bed and breakfast	🛏️
277	Bog	{NE,"N Cent","NW + AK"}	{"Rural / Xurban"}	{Day}	Tween	Low	{All}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Pantano	🌿
284	Campground	{All}	{"Rural / Xurban"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Campamento	🏕️
287	Circle	{All}	{All}	{Day,Night}	Young	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Círculo	⚪
292	Diamond	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Diamante	💎
279	Fishing	{All}	{"Rural / Xurban",Coast}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Pesca	🎣
275	Forest	{All}	{"Rural / Xurban","Suburban / Town",Highway}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Bosque	🌲
281	Hotel	{All}	{All}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Hotel	🏨
274	Igneous Rock	{SE,"NW + AK"}	{Highway,"Rural / Xurban"}	{Day}	Tween	Low	{All}	{"Flora & Fauna"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Roca ígnea	🪨
291	Line	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Línea	〰️
278	Marsh	{NE,"N Cent","NW + AK"}	{"Rural / Xurban",Coast}	{Day}	Tween	Low	{All}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Pantano	🦆
272	Massachusetts plate	{NE,"N Cent"}	{All}	{Day}	Kid	Medium	{All}	{"License plate"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Placa de Massachusetts	🚘
276	Meadow	{All}	{"Rural / Xurban","Suburban / Town",Highway}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Pradera	🌾
282	Motel	{All}	{All}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Motel	🏨
295	Orange Light	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Luz naranja	🟠
293	Oval	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Óvalo	⭕
285	RV park	{All}	{"Suburban / Town","Rural / Xurban"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Parque para casas rodantes	🚐
290	Rectangle	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Rectángulo	▭
294	Red Light	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Luz roja	🔴
271	Rhode Island plate	{NE,"N Cent"}	{All}	{Day}	Kid	Medium	{All}	{"License plate"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Placa de Rhode Island	🚘
273	Sedimentary Layers	{All}	{Highway,"Rural / Xurban"}	{Day}	Tween	Low	{All}	{"Flora & Fauna"}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Capas sedimentarias	🪨
288	Square	{All}	{All}	{Day,Night}	Young	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Cuadrado	⬜
286	Trailer park	{All}	{"Suburban / Town","Rural / Xurban"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Parque de casas rodantes	🏕️
289	Triangle	{All}	{All}	{Day,Night}	Young	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Triángulo	🔺
280	Windsock Man	{All}	{"Suburban / Town","Urban / City"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Hombre de manga de viento	🎐
300	Blinking Light	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Luz parpadeante	💡
320	Ambulance	{All}	{All}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:35:25.797+00	Ambulancia	🚑
307	Boat	{All}	{All,Coast}	{Day}	Young	Medium	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Bote	🚤
322	Bridge	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Puente	🌉
301	Bus	{All}	{All}	{Day,Night}	Young	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Autobús	🚌
302	Car	{All}	{All}	{Day,Night}	Young	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Auto	🚗
327	Cartoon	{All}	{Highway,"Urban / City","Suburban / Town"}	{Day,Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Caricatura	📺
324	Dock	{All}	{Coast,"Suburban / Town","Rural / Xurban"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Muelle	🛶
313	Exit	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Salida	↗️
319	Firefighter	{All}	{All}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Bombero	🧑‍🚒
315	Flag	{All}	{All}	{Day}	Young	High	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Bandera	🚩
297	Green Light	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Luz verde	🟢
308	Helicopter	{All}	{"Urban / City"}	{Day}	Young	Low	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Helicóptero	🚁
309	Light	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Luz	💡
328	Mascot	{All}	{Highway,"Urban / City","Suburban / Town"}	{Day,Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Mascota	🐾
304	Motorcycle	{All}	{All}	{Day,Night}	Young	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Motocicleta	🏍️
314	Parking	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Estacionamiento	🅿️
306	Plane	{All}	{All}	{Day,Night}	Young	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Avión	✈️
318	Police	{All}	{All}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Policía	👮
466	Posted “No Hunting” sign	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Letrero de “No cazar”	🪧
298	Purple Light	{All}	{All}	{Day,Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Luz morada	🟣
317	Restaurant	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Restaurante	🍽️
321	Security	{All}	{All}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Seguridad	🛡️
310	Stop	{All}	{All}	{Day,Night}	Young	High	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Alto	🛑
305	Train	{All}	{All}	{Day}	Young	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Tren	🚆
303	Truck	{All}	{All}	{Day,Night}	Young	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Camión	🚚
323	Tunnel	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Túnel	🚇
299	White Light	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Luz blanca	⚪
296	Yellow Light	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.334245+00	2026-04-01 02:11:26.334245+00	Luz amarilla	🟡
312	Yield	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Ceda el paso	⚠️
339	Basketball Hoop	{All}	{"Urban / City","Suburban / Town","Rural / Xurban"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Aro de básquetbol	🏀
352	Billboard	{All}	{Highway,"Urban / City","Suburban / Town"}	{Day,Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Anuncio espectacular	🪧
351	Blinking Antenna	{All}	{All}	{Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Antena parpadeante	📡
353	Digital Traffic Info Sign	{All}	{All}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Señal digital de tráfico	🪧
347	Do not enter	{All}	{Highway,"Urban / City","Suburban / Town"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	No entrar	⛔
331	Dragon	{All}	{Highway,"Urban / City","Suburban / Town"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Dragón	🐉
355	Electrical Sub Station	{All}	{"Urban / City","Suburban / Town"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Subestación eléctrica	⚡
359	Fire Station	{All}	{"Urban / City","Suburban / Town"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Estación de bomberos	🚒
337	Football	{All}	{"Suburban / Town","Urban / City"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Fútbol americano	🏈
357	Gas Station	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Gasolinera	⛽
341	Horn Sound	{All}	{All}	{Day,Night}	Kid	Medium	{All}	{Sounds,Chaos}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Sonido de claxon	📯
330	Monster	{All}	{Highway,"Urban / City","Suburban / Town"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Monstruo	👹
354	Neon Open Sign	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Letrero neón de abierto	🟣
345	No Parking	{All}	{"Urban / City","Suburban / Town"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	No estacionarse	🚫
346	One Way	{All}	{Highway,"Urban / City","Suburban / Town"}	{Day,Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Una sola dirección	➡️
344	Pedestrian Crossing	{All}	{"Urban / City","Suburban / Town"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Cruce peatonal	🚸
340	Racing	{All}	{}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Carreras	🏎️
335	Skiing	{NE,"NW + AK"}	{"Rural / Xurban",Highway}	{Day}	Kid	Low	{All,Winter}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Esquí	⛷️
336	Soccer	{All}	{"Suburban / Town","Urban / City"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Fútbol	⚽
348	Speed limit	{All}	{All}	{Day,Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Límite de velocidad	🚗
343	Stalled Vehicle	{All}	{Highway}	{Day,Night}	Kid	Medium	{All}	{Chaos}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Vehículo descompuesto	🚗
356	Subway Station	{NE,"N Cent","NW + AK"}	{"Urban / City"}	{Day,Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Estación de metro	🚇
333	Superhero	{All}	{Highway,"Urban / City","Suburban / Town"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Superhéroe	🦸
334	Tennis	{All}	{"Urban / City","Suburban / Town"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Tenis	🎾
342	Traffic Jam	{All}	{All}	{Day}	Kid	Medium	{All}	{Chaos}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Tráfico	🚗
358	Train Station	{All}	{"Urban / City","Suburban / Town",Highway}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Estación de tren	🚉
332	Unicorn	{All}	{Highway,"Urban / City","Suburban / Town"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Unicornio	🦄
386	Army Vehicle	{All}	{All}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Vehículo militar	🪖
361	Bus Station	{All}	{"Urban / City","Suburban / Town"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Estación de autobuses	🚏
377	Flag Pole	{All}	{All}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Asta de bandera	🚩
374	Foreign Flag	{All}	{All}	{Day}	Tween	Low	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Bandera extranjera	🏳️
390	Ghost	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Fantasma	👻
392	Hay	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Heno	🌾
381	J	{All}	{All}	{Day,Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	J	🔤
376	Light Pole	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Poste de luz	💡
363	Main Street	{All}	{"Suburban / Town"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Calle principal	🏙️
373	Military Flag	{All}	{All}	{Day}	Tween	Low	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Bandera militar	🚩
379	North Pole	{All}	{All}	{Day}	Kid	Low	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Polo Norte	🎅
372	POW Flag	{All}	{All}	{Day}	Tween	Low	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Bandera POW	🏴
364	Police Car Lights	{All}	{Highway,"Urban / City","Suburban / Town"}	{Day,Night}	Kid	Medium	{All}	{General,Chaos}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Luces de patrulla	🚓
360	Police Station	{All}	{"Urban / City","Suburban / Town"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Estación de policía	🚓
370	Political Flag	{All}	{All}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Bandera política	🚩
391	Pumpkin	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Calabaza	🎃
380	Q	{All}	{All}	{Day,Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Q	🔤
385	School Bus	{All}	{All}	{Day}	Young	Medium	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Autobús escolar	🚌
378	Sign Pole	{All}	{All}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Poste de señal	🪧
369	State Flag	{All}	{All}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Bandera estatal	🚩
388	Suspension Bridge	{All}	{All}	{Day,Night}	Tween	Low	{All}	{General,Architecture}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Puente colgante	🌉
375	Telephone Pole	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Poste de teléfono	☎️
387	Tow Truck	{All}	{All}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Grúa	🚚
362	UFO	{All}	{All}	{Night}	Tween	Low	{All}	{General,Chaos}	Meh	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	OVNI	🛸
389	Witch	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Bruja	🧙
383	X	{All}	{All}	{Day,Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	X	🔤
384	Y	{All}	{All}	{Day,Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Y	🔤
366	Yellow Security Lights	{All}	{Highway,"Urban / City","Suburban / Town"}	{Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Luces amarillas de seguridad	🟡
382	Z	{All}	{All}	{Day,Night}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Z	🔤
410	Boo!	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	Medium	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	¡Buu!	👻
399	Broom	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Escoba	🧹
415	Candy	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	Medium	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Dulce	🍬
403	Cauldron	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Caldero	🧙
413	Cobweb	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Telaraña	🕸️
409	Coffin	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	Medium	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Ataúd	⚰️
414	Costume	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	Medium	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Disfraz	🎭
416	Creepy shadows	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Sombras espeluznantes	👥
418	Eerie noises	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	Medium	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Ruidos extraños	🎶
406	Frankenstein	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	Medium	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Frankenstein	🧟
407	Full moon	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	Medium	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Luna llena	🌕
397	Grim reaper	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Tween	Medium	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	La parca	💀
411	Happy Halloween!	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	¡Feliz Halloween!	🎃
412	Haunted House	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Casa embrujada	🏚️
393	Jack o Lantern	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Calabaza de Halloween	🎃
421	Jesus	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Jesús	✝️
417	Leaves	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Hojas	🍂
405	Mummy	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Momia	🧻
420	Reindeer	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Young	High	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Reno	🦌
419	Santa	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Young	High	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Santa	🎅
422	Sheperds	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Pastores	🐑
395	Skeleton	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Esqueleto	💀
396	Skull	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Calavera	💀
408	Toilet paper trees	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Árboles con papel de baño	🧻
404	Vampire	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Vampiro	🧛
394	Zombie	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	Medium	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Zombi	🧟
455	Brick wall	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Pared de ladrillo	🧱
463	Camper	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Casa rodante	🚐
447	Chimney	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Chimenea	🏠
428	Christmas tree	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Young	High	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Árbol de Navidad	🎄
446	Construction cone	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Cono de construcción	🚧
461	County or state line	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Límite del condado o del estado	📍
460	Electrical transformer	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Transformador eléctrico	⚡
435	Elves	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Duendes	🧝
452	Fence	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Cerca	🪵
459	Flowers	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Flores	💐
436	Garbage Truck	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Camión de basura	🚛
445	Gazebo	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Quiosco	🏡
454	Guardrail	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Barandal de contención	🛣️
437	Haybales	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Pacas de heno	🌾
450	Historical marker	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Marcador histórico	📍
439	Holiday decoration	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Decoración festiva	🎉
426	Holly	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	Low	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Acebo	🌿
438	Lawn ornament	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Adorno de jardín	🪴
458	Mailbox	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Buzón	📬
431	Manger	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Pesebre	🐑
441	Minivan	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Miniván	🚐
442	Murals	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Murales	🎨
462	Oak or maple tree	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Roble o arce	🌳
440	Old car	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Auto viejo	🚗
464	Pinwheel	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Rehilete	🌀
433	Presents	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Young	High	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Regalos	🎁
424	Red & Green	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Rojo y verde	🔴
434	Red ribbon	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Listón rojo	🎀
448	Smoke	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Humo	💨
449	Smokestack	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Chimenea industrial	🏭
453	Spare tire	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Llanta de refacción	🛞
456	Stone wall	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Muro de piedra	🪨
443	Storage units	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Bodegas	📦
451	Stream or creek	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Arroyo o riachuelo	🏞️
457	Trailer	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Remolque	🚛
465	Windmill	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Molino de viento	🌬️
423	Wise men	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Reyes magos	👑
506	Basketball court	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Cancha de básquetbol	🏀
498	Beach or sand	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Playa o arena	🏝️
512	Birch tree	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Abedul	🌳
474	Blinker lights	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Luces direccionales	🚗
510	Blue service sign	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Señal azul de servicios	🪧
475	Brake lights	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Luces de freno	🚗
478	Car transport semi	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Tráiler transportador de autos	🚛
508	Cars of various colors	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Autos de varios colores	🚗
509	Caution sign	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Señal de precaución	⚠️
492	Cement truck	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Camión de cemento	🚚
486	Concrete barrier	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Barrera de concreto	🚧
507	Covered bridge	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Puente cubierto	🌉
468	Dam	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Presa	💧
479	Dead tree	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Árbol muerto	🌳
500	Duck	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Pato	🦆
473	Exit sign	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Señal de salida	🚪
471	Farm stand	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Puesto de granja	🥕
495	Fire truck	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Camión de bomberos	🚒
496	Flatbed truck	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Camión de plataforma	🚚
493	Gas truck	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Camión de gasolina	🚚
485	Grafitti	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Grafiti	🎨
488	Highway	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Autopista	🛣️
469	Hydropower dam	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Presa hidroeléctrica	⚡
472	Interstate sign	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Señal de autopista interestatal	🛣️
489	Mausoleum	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Mausoleo	🏛️
502	Moose, elk, or bison	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Alce, wapití o bisonte	🦬
487	One-way street sign	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Señal de un solo sentido	🪧
516	Orange balls on wires	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Bolas naranjas en cables	🟠
494	Pickup truck	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Camioneta pickup	🛻
501	Pigeon	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Paloma	🕊️
482	Pink or magenta color	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Color rosa o magenta	🩷
497	Post office	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Oficina de correos	📮
513	Rain cloud	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Nube de lluvia	🌧️
514	Reflectors	{All}	{}	{Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Reflejantes	✨
467	Solar panel	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Panel solar	☀️
499	Squirrel	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Ardilla	🐿️
490	Statue	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Estatua	🗽
484	Stores	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Tiendas	🏬
505	Tennis court	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Cancha de tenis	🎾
481	U-turn or No U-turn sign	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Vuelta en U o señal de no vuelta en U	↩️
511	Valley	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Valle	🏞️
544	Antique store	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Tienda de antigüedades	🏺
517	Bike	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Bicicleta	🚲
542	Bumper sticker	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Calcomanía en la defensa	🚗
520	Car pulled over	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Auto detenido	🚓
519	Cobblestones	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Adoquines	🪨
545	Construction site	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Sitio de construcción	🏗️
559	Crosswalk	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Paso peatonal	🚸
558	Drive-thru	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Autoservicio	🚗
554	EV charging station	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Estación de carga para autos eléctricos	🔌
539	Fart sound	{All}	{}	{Night,Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Sonido de pedo	💨
531	Fast food	{All}	{}	{Night,Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Comida rápida	🍟
528	Flower smell	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Olor a flor	🌸
538	Flowering tree	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Árbol floreado	🌸
550	For lease sign	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Letrero de se renta	🪧
549	For sale sign	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Letrero de se vende	🪧
561	Fountain	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Fuente	⛲
553	Garage or yard sale	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Venta de garaje o de patio	🏷️
527	Grass cut smell	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Olor a pasto cortado	🌱
556	Handicap sign	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Señal de discapacidad	♿
532	Lawnmower	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Podadora	🧑‍🌾
540	Moss	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Musgo	🌿
525	Motorcycle engine noise	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Ruido de motor de motocicleta	🏍️
562	Parking Sign	{All}	{}	{Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Señal de estacionamiento	🅿️
526	Pollution smell	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Olor a contaminación	🏭
518	Rack on top of car	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Parrilla en el techo del auto	🚗
530	Rain smell	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Olor a lluvia	🌧️
551	Rip rap	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Escollera	🪨
548	Rock wall	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Muro de piedra	🪨
555	Roundabout	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Glorieta	🔄
529	Sea or beach smell	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Olor a mar o playa	🌊
522	Siren	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Sirena	🚨
533	Tall grasses	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Pastos altos	🌾
560	Tollbooth	{All}	{}	{Night,Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Caseta de cobro	🛣️
536	Trash	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Basura	🗑️
543	Vintage car	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Auto vintage	🚘
552	Waterfall	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Cascada	💦
546	Well	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Pozo	🪣
521	Wetland	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Humedal	🦆
535	Wishful stops	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Paradas deseadas	🛑
563	Bear	{All}	{}	{}	\N	\N	{Spring,Summer,Fall}	{"Nat Park - Yosemite"}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Oso	🐻
367	Airport Runway Lights	{All}	{"Urban / City",Highway}	{Night}	Kid	Low	{All}	{General}	Meh	2026-04-01 02:11:26.345604+00	2026-04-01 02:38:20.695+00	Luces de pista del aeropuerto	🛫
326	Alien	{All}	{All}	{Night}	Kid	High	{All}	{General,Chaos}	Meh	2026-04-01 02:11:26.340871+00	2026-04-01 02:35:25.257+00	Extraterrestre	👽
368	American Flag	{All}	{All}	{Day,Night}	Young	High	{All}	{General}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:35:26.486+00	Bandera de Estados Unidos	🇺🇸
504	Animal home	{All}	{}	{Day}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:35:27.837+00	Hogar de animal	🪺
523	Animal noise	{All}	{}	{Day,Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:35:28.453+00	Sonido de animal	🐾
176	Ant	{All}	{"Rural / Xurban","Suburban / Town","Urban / City",Coast}	{Day}	Kid	Medium	{Spring,Summer}	{General,"Flora & Fauna"}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:36:09.175+00	Hormiga	🐜
311	Arrow	{All}	{All}	{Day,Night}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Flecha	➡️
476	Bag caught in tree	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Bolsa atorada en un árbol	🛍️
248	Barge	{All}	{"Rural / Xurban","Suburban / Town"}	{Day}	Kid	Low	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Barcaza	🛳️
338	Baseball	{All}	{"Urban / City","Suburban / Town"}	{Day}	Kid	Medium	{All}	{General}	\N	2026-04-01 02:11:26.340871+00	2026-04-01 02:11:26.340871+00	Béisbol	⚾
400	Bat	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Murciélago	🦇
575	Bear Proof Box	{All}	{}	{}	\N	\N	{}	{"Nat Park - Yosemite"}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Caja a prueba de osos	📦
427	Bells	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	Medium	{Winter}	{Christmas}	\N	2026-04-01 02:11:26.349388+00	2026-04-01 02:11:26.349388+00	Campanas	🔔
215	Birds on a wire	{All}	{All}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.329626+00	2026-04-01 02:11:26.329626+00	Pájaros en un cable	🐦
398	Black cat	{All}	{"Suburban / Town","Urban / City"}	{Day,Night}	Kid	High	{Fall}	{Halloween}	\N	2026-04-01 02:11:26.345604+00	2026-04-01 02:11:26.345604+00	Gato negro	🐈‍⬛
189	Boulder	{All}	{All}	{Day}	Kid	High	{All}	{General}	\N	2026-04-01 02:11:26.323926+00	2026-04-01 02:11:26.323926+00	Roca grande	🪨
491	Car dealer	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.352882+00	2026-04-01 02:11:26.352882+00	Agencia de autos	🚘
547	Car with one headlight	{All}	{}	{Night}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.355842+00	2026-04-01 02:11:26.355842+00	Auto con un faro	🚗
573	Chipmunk	{All}	{}	{}	\N	\N	{}	{"Nat Park - Yosemite"}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Ardilla listada	🐿️
574	Crow / Raven	{All}	{}	{}	\N	\N	{}	{"Nat Park - Yosemite"}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Cuervo	🐦‍⬛
571	Curry Village	{All}	{}	{}	\N	\N	{}	{"Nat Park - Yosemite"}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Curry Village	🏕️
569	El Capitan	{All}	{}	{}	\N	\N	{}	{"Nat Park - Yosemite"}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	El Capitán	⛰️
572	Giant Sequoia Tree	{All}	{}	{}	\N	\N	{}	{"Nat Park - Yosemite"}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Secuoya gigante	🌲
567	Glacier Point	{All}	{}	{}	\N	\N	{}	{"Nat Park - Yosemite"}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Glacier Point	🏔️
568	Halfdome	{All}	{}	{}	\N	\N	{}	{"Nat Park - Yosemite"}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Half Dome	⛰️
578	Horses	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Caballos	🐎
565	John Muir trail	{All}	{}	{}	\N	\N	{}	{"Nat Park - Yosemite"}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Sendero John Muir	🥾
579	Lizard	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Lagartija	🦎
576	Merced River	{All}	{}	{}	\N	\N	{}	{"Nat Park - Yosemite"}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Río Merced	🏞️
570	Sentinal Dome	{All}	{}	{}	\N	\N	{}	{"Nat Park - Yosemite"}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Sentinel Dome	⛰️
580	Snake	{All}	{}	{}	\N	\N	{}	{}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Serpiente	🐍
566	Vernal Falls	{All}	{}	{Day}	\N	\N	{}	{"Nat Park - Yosemite"}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Vernal Falls	💦
577	Wood Cabin	{All}	{}	{}	\N	\N	{}	{"Nat Park - Yosemite"}	\N	2026-04-01 02:11:26.360008+00	2026-04-01 02:11:26.360008+00	Cabaña de madera	🪵
\.


--
-- Name: bingo_words_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bingo_words_id_seq', 604, true);


--
-- PostgreSQL database dump complete
--

\unrestrict 5DtKk5gJgeh67hkfiZhETLmDLvO8ksk9PSsjDy3D2paX8aE6Yb05o2RK6QSDjCT

