# Mini-game 1 — Micro-Mechanics Master Backlog

Purpose: finish Game 1 as the master/reference Tetris implementation, one small mechanic at a time. Do not mix gameplay code between games.

## Rules for this backlog

For every mechanic:
1. Research/reference behavior.
2. Write expected behavior and edge cases.
3. Implement only that mechanic.
4. Add/extend a deterministic self-test where possible.
5. Manually stress-test the mechanic.
6. Mark it complete only when it is stable.
7. Do not silently change unrelated mechanics.

Status:
- [x] Implemented
- [~] Implemented but needs verification/polish
- [ ] Not done

## A. Movement and input feel

1. [x] Timestamp-driven DAS/ARR foundation
2. [ ] Exact first-repeat timing
3. [ ] ARR=0 wall-to-wall timing
4. [ ] ARR>0 repeat cadence
5. [ ] Direction reversal while DAS is charging
6. [ ] Direction reversal after ARR begins
7. [ ] Simultaneous left/right policy
8. [ ] Key-repeat duplicate suppression
9. [ ] Keyboard rollover behavior
10. [ ] Rotation during DAS
11. [ ] Hold during DAS
12. [ ] Hard drop during DAS
13. [ ] Soft drop during DAS
14. [ ] Movement after spawn
15. [ ] Movement immediately after hold
16. [ ] Movement immediately after rotation
17. [ ] Movement during lock delay
18. [ ] DAS state after rotation
19. [ ] DAS state after hold
20. [ ] DAS state after hard drop/new piece

## B. Rotation

21. [ ] Exact JLSTZ SRS 90-degree kicks
22. [ ] Exact I-piece SRS+ kicks
23. [ ] Validate every SRS transition
24. [ ] Floor-kick cases
25. [ ] Wall-kick cases
26. [ ] Ceiling-kick cases
27. [ ] Tuck cases
28. [ ] Rotation beside garbage
29. [ ] Failed rotation is inert
30. [ ] Rotation buffering policy
31. [ ] Rotation priority policy
32. [ ] Direct 180-degree rotation
33. [ ] Exact TETR.IO-style 180 kick data
34. [ ] 180 near left wall
35. [ ] 180 near right wall
36. [ ] 180 near floor
37. [ ] 180 under overhang
38. [ ] 180 around stacked blocks
39. [ ] 180 lock-delay behavior
40. [ ] 180 visual timing never blocks simulation

## C. Gravity and locking

41. [ ] Level-based gravity model
42. [ ] Gravity precision
43. [ ] Gravity catch-up policy
44. [ ] Soft-drop timing
45. [ ] Soft-drop speed settings
46. [ ] Soft-drop scoring
47. [ ] Hard-drop scoring
48. [ ] Hard drop immediate lock
49. [ ] No hidden hard-drop cooldown
50. [ ] Correct grounded-state detection
51. [ ] Lock delay start
52. [ ] Lock delay reset on movement
53. [ ] Lock delay reset on rotation
54. [ ] Lock reset cap
55. [ ] High-gravity lock behavior
56. [ ] 20G behavior
57. [ ] Spawn collision
58. [ ] Top-out above visible field
59. [ ] Top-out at spawn
60. [ ] Locking above the visible field

## D. Piece generation / spawn

61. [ ] Verify true 7-bag
62. [ ] Verify deterministic seeded bag
63. [ ] Verify bag boundaries
64. [ ] Five-piece preview
65. [ ] Preview ordering
66. [ ] Preview rendering
67. [ ] Hold queue
68. [ ] Hold swap
69. [ ] One hold per active piece
70. [ ] Hold spawn reset
71. [ ] Hold + DAS
72. [ ] Hold + rotation
73. [ ] First-piece hold policy
74. [ ] Spawn orientation
75. [ ] Spawn x/y positions
76. [ ] Spawn collision rules
77. [ ] Optional 6-piece preview support

## E. Line clears

78. [ ] Single clear
79. [ ] Double clear
80. [ ] Triple clear
81. [ ] Tetris
82. [ ] Simultaneous line detection
83. [ ] Correct collapse
84. [ ] Clear animation
85. [ ] Input during clear animation
86. [ ] Input buffering around clear
87. [ ] Combo preservation
88. [ ] B2B preservation
89. [ ] B2B break rules
90. [ ] Perfect-clear detection
91. [ ] Perfect-clear score
92. [ ] Perfect-clear feedback
93. [ ] Multi-event ordering
94. [ ] Clear timing independent from simulation

## F. T-spins and advanced scoring

95. [ ] Three-corner T-spin detection
96. [ ] T-spin mini detection
97. [ ] T-spin zero
98. [ ] T-spin single
99. [ ] T-spin double
100. [ ] T-spin triple
101. [ ] Mini single
102. [ ] Mini double
103. [ ] Kick-assisted T-spin recognition
104. [ ] T-spin B2B
105. [ ] T-spin combo
106. [ ] T-spin scoring
107. [ ] T-spin feedback
108. [ ] Mini-spin feedback

## G. Combo / B2B / score feel

109. [ ] Combo starts correctly
110. [ ] Combo increments correctly
111. [ ] Combo breaks correctly
112. [ ] Combo score curve
113. [ ] B2B difficult-clear definition
114. [ ] B2B multiplier
115. [ ] Tetris B2B
116. [ ] T-spin B2B
117. [ ] Combo + B2B interaction
118. [ ] Hard-drop score display
119. [ ] Soft-drop score display
120. [ ] Floating score popups
121. [ ] Score animation
122. [ ] Level multiplier
123. [ ] Perfect-clear score display

## H. Ghost / visual feedback

124. [ ] Ghost-piece correctness
125. [ ] Ghost collision correctness
126. [ ] Ghost opacity
127. [ ] Active-piece depth
128. [ ] 3D orientation visualization
129. [ ] 180 flip visualization
130. [ ] Spawn feedback
131. [ ] Lock impact
132. [ ] Line-clear impact
133. [ ] Tetris impact
134. [ ] T-spin impact
135. [ ] Combo escalation
136. [ ] B2B feedback
137. [ ] Perfect-clear feedback
138. [ ] Low-stack warning
139. [ ] Danger-state feedback
140. [ ] Optional screen shake
141. [ ] Reduced-motion mode
142. [ ] Visual effects never block input

## I. Audio / juice

143. [ ] Piece spawn sound
144. [ ] Rotation sound
145. [ ] Distinct 180 sound
146. [ ] Hard-drop sound
147. [ ] Soft-drop sound
148. [ ] Lock sound
149. [ ] Single sound
150. [ ] Double sound
151. [ ] Triple sound
152. [ ] Tetris sound
153. [ ] T-spin sound
154. [ ] B2B sound
155. [ ] Combo escalation
156. [ ] Perfect-clear sound
157. [ ] Warning sound
158. [ ] Audio latency audit
159. [ ] Audio mute setting
160. [ ] Audio never controls game timing

## J. Competitive foundation

161. [ ] Attack calculation
162. [ ] Garbage queue
163. [ ] Garbage cancellation
164. [ ] Garbage insertion
165. [ ] Garbage-hole generation
166. [ ] Garbage messiness
167. [ ] Garbage delay
168. [ ] Counterattack
169. [ ] B2B attack bonus
170. [ ] Combo attack
171. [ ] T-spin attack
172. [ ] Perfect-clear attack
173. [ ] Incoming garbage warning
174. [ ] Garbage blocking
175. [ ] Garbage spike behavior
176. [ ] Clutch clear behavior
177. [ ] Clutch counter behavior
178. [ ] Garbage timing
179. [ ] Target selection
180. [ ] Target switching

## K. Classic / Facebook / Tetris Friends-inspired modes

181. [ ] Marathon
182. [ ] Level progression
183. [ ] Variable/fixed goal option
184. [ ] Sprint 40
185. [ ] Ultra timer
186. [ ] Survival
187. [ ] Battle
188. [ ] Asynchronous ghost opponent
189. [ ] Replay opponent
190. [ ] KO counter
191. [ ] Rank progression
192. [ ] Stars / progression feedback
193. [ ] Bomb garbage framework
194. [ ] Bomb explosion rules
195. [ ] Bomb combo interaction
196. [ ] Solid garbage
197. [ ] Special garbage variants
198. [ ] Item/boost framework
199. [ ] Shield-style mechanic
200. [ ] Final-rush-style mechanic

## L. 180180 signature trainer mechanics

201. [ ] 180 mastery score
202. [ ] Clean-180 counter
203. [ ] 180 streak
204. [ ] 180 timing grade
205. [ ] 180 placement grade
206. [ ] 180 misdrop detection
207. [ ] 180 substitution detection
208. [ ] 180 efficiency rating
209. [ ] 180 difficulty rating
210. [ ] 180 kick trajectory visualization
211. [ ] 3D depth toggle
212. [ ] 3D flip preview
213. [ ] Ghost-depth visualization
214. [ ] Rotation history
215. [ ] Input timeline
216. [ ] Finesse timeline
217. [ ] Placement heatmap
218. [ ] Mistake replay
219. [ ] Explain-why-this-failed feedback
220. [ ] Suggested placement
221. [ ] Personal-best comparison
222. [ ] Best-run ghost
223. [ ] Instant replay
224. [ ] Training score breakdown
225. [ ] Session accuracy
226. [ ] Speed grade
227. [ ] Consistency grade
228. [ ] Recovery grade
229. [ ] 180 mastery progression
230. [ ] Final Game 1 master certification

## Current execution order

We are deliberately proceeding in small verified slices:

1. [x] Build isolated Game 1 architecture.
2. [x] Establish timestamp-driven DAS/ARR foundation.
3. [ ] Validate DAS/ARR against a deterministic timing matrix.
4. [ ] Fix any timing edge cases found by that matrix.
5. [ ] Lock down exact SRS/SRS+ 90-degree behavior.
6. [ ] Lock down exact 180-degree kick behavior.
7. [ ] Audit gravity/lock delay.
8. [ ] Upgrade finesse detection from the current rough heuristic.
9. [ ] Audit scoring/combo/B2B/T-spin ordering.
10. [ ] Separate simulation-state emission from render/HUD work.
11. [ ] Tune the 3D trainer visualization so it never interferes with play.
12. [ ] Add juice/audio only after mechanics are stable.
13. [ ] Add competitive mechanics as isolated systems.
14. [ ] Add classic/Facebook-inspired modes.
15. [ ] Finish the 180180 trainer layer.
16. [ ] Run final regression/stress pass.
17. [ ] Freeze Game 1 as the master blueprint.
18. [ ] Build Games 2–6 independently from that blueprint without sharing gameplay code.

## Research references

- TETR.IO: https://tetris.wiki/Tetr.io
- Tetris Guideline: https://www.tetris.wiki/Guideline
- Tetris Friends: https://tetris.wiki/Tetris_Friends
- Tetris Battle (Facebook): https://news.tetris.wiki/Tetris_Battle_%28Facebook%29
- Combo behavior: https://tetris.wiki/Combo
