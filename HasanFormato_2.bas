Attribute VB_Name = "HasanFormato"
' ============================================================
'  HASAN Estudio — Macro de Formato  (v2 — colores corregidos)
'  Aplica encabezado de marca, colores por departamento
'  y ancho óptimo de columna Comentario.
'
'  INSTRUCCIONES:
'  1. En Excel: Alt + F11  (abre el Editor VBA)
'  2. Menú Insertar > Módulo
'  3. Pega todo este código en el módulo vacío
'  4. Cierra el editor. En Excel: Alt + F8 > AplicarFormatoHasan > Ejecutar
'
'  NOTA: Si ya tienes el módulo anterior, reemplaza todo el contenido.
' ============================================================

Sub AplicarFormatoHasan()

    Dim wb       As Workbook
    Dim ws       As Worksheet
    Dim version  As String
    Dim fecha    As String
    Dim proyecto As String
    Dim numCols  As Integer
    Dim lastRow  As Long
    Dim i        As Long
    Dim j        As Integer
    Dim dept     As String
    Dim maxLen   As Long
    Dim cellLen  As Long

    ' ── Configuración — edita aquí si cambia el proyecto ───
    version  = "v1.0"
    fecha    = Format(Now(), "DD/MM/YYYY")
    proyecto = "DOGMAN"
    numCols  = 4

    Set wb = ThisWorkbook

    For Each ws In wb.Worksheets

        ' ── 1. Eliminar header previo si existe ──────────────
        If InStr(1, CStr(ws.Cells(1, 1).Value), "HASAN") > 0 Then
            ws.Rows("1:3").Delete Shift:=xlUp
        End If

        ' ── 2. Insertar 3 filas para el header ───────────────
        ws.Rows("1:3").Insert Shift:=xlDown, CopyOrigin:=xlFormatFromLeftOrAbove

        ' ── FILA 1: Encabezado principal blanco ──────────────
        ws.Range(ws.Cells(1, 1), ws.Cells(1, numCols)).Merge
        With ws.Cells(1, 1)
            .Value              = "HASAN  Script Breakdown  ·  Desglose de Sonido"
            .Interior.Color     = RGB(255, 255, 255)   ' blanco
            .Font.Name          = "Arial"
            .Font.Size          = 14
            .Font.Bold          = True
            .Font.Color         = RGB(28, 28, 28)      ' casi negro
            .HorizontalAlignment = xlLeft
            .VerticalAlignment  = xlCenter
            .IndentLevel        = 1
        End With
        ws.Rows(1).RowHeight = 28

        ' ── FILA 2: Línea naranja HASAN ───────────────────────
        ws.Range(ws.Cells(2, 1), ws.Cells(2, numCols)).Merge
        With ws.Cells(2, 1)
            .Value          = ""
            .Interior.Color = RGB(245, 166, 35)        ' naranja #F5A623
        End With
        ws.Rows(2).RowHeight = 4

        ' ── FILA 3: Barra negra — proyecto / versión / fecha ─
        ws.Range(ws.Cells(3, 1), ws.Cells(3, 2)).Merge
        With ws.Cells(3, 1)
            .Value               = "PROYECTO: " & proyecto & "  ·  " & UCase(ws.Name)
            .Interior.Color      = RGB(0, 0, 0)        ' negro
            .Font.Name           = "Arial"
            .Font.Size           = 10
            .Font.Bold           = False
            .Font.Color          = RGB(245, 166, 35)   ' naranja HASAN
            .HorizontalAlignment = xlLeft
            .VerticalAlignment   = xlCenter
            .IndentLevel         = 1
        End With

        ws.Range(ws.Cells(3, 3), ws.Cells(3, numCols)).Merge
        With ws.Cells(3, 3)
            .Value               = "Versi" & Chr(243) & "n: " & version & "     Fecha: " & fecha
            .Interior.Color      = RGB(0, 0, 0)        ' negro
            .Font.Name           = "Arial"
            .Font.Size           = 10
            .Font.Color          = RGB(136, 136, 136)  ' gris
            .HorizontalAlignment = xlRight
            .VerticalAlignment   = xlCenter
            .IndentLevel         = 1
        End With
        ws.Rows(3).RowHeight = 20

        ' ── FILA 4: Fila de encabezados de columna ───────────
        For j = 1 To numCols
            With ws.Cells(4, j)
                .Interior.Color      = RGB(238, 235, 229)  ' crema #EEEBE5
                .Font.Name           = "Arial"
                .Font.Size           = 12
                .Font.Bold           = True
                .Font.Color          = RGB(28, 28, 28)
                .HorizontalAlignment = xlLeft
                .VerticalAlignment   = xlCenter
                .IndentLevel         = 1
            End With
        Next j
        ws.Rows(4).RowHeight = 18

        ' ── Colores por departamento (filas 5+) ───────────────
        lastRow = ws.Cells(ws.Rows.Count, 2).End(xlUp).Row
        maxLen  = 0

        For i = 5 To lastRow
            dept = CStr(ws.Cells(i, 2).Value)

            Select Case dept
                Case "Ambientes"
                    For j = 1 To numCols
                        ws.Cells(i, j).Interior.Color = RGB(255, 165, 0)   ' naranja #FFA500
                    Next j
                Case "Di" & Chr(225) & "logos"
                    For j = 1 To numCols
                        ws.Cells(i, j).Interior.Color = RGB(144, 238, 144) ' verde   #90EE90
                    Next j
                Case "Efectos"
                    For j = 1 To numCols
                        ws.Cells(i, j).Interior.Color = RGB(255, 182, 193) ' rosa    #FFB6C1
                    Next j
            End Select

            ' Fuente uniforme para filas de datos
            For j = 1 To numCols
                With ws.Cells(i, j)
                    .Font.Name          = "Arial"
                    .Font.Size          = 12
                    .Font.Color         = RGB(28, 28, 28)
                    .VerticalAlignment  = xlCenter
                    .WrapText           = True
                    .IndentLevel        = 1
                End With
            Next j
            ws.Rows(i).RowHeight = 16

            ' Longitud máxima en columna D (Comentario)
            cellLen = Len(CStr(ws.Cells(i, 4).Value))
            If cellLen > maxLen Then maxLen = cellLen
        Next i

        ' ── Ancho óptimo columna D ────────────────────────────
        ws.Columns("D").ColumnWidth = maxLen + 2

    Next ws

    MsgBox Chr(10) & "  Formato HASAN aplicado en " & wb.Worksheets.Count & " hojas.  " & Chr(10), _
           vbInformation, "HASAN Estudio"

End Sub
