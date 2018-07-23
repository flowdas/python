.. _tut-informal:

**********************************
An Informal Introduction to Python
**********************************

In the following examples, input and output are distinguished by the presence or
absence of prompts (:term:`>>>` and :term:`...`): to repeat the example, you must type
everything after the prompt, when the prompt appears; lines that do not begin
with a prompt are output from the interpreter. Note that a secondary prompt on a
line by itself in an example means you must type a blank line; this is used to
end a multi-line command.

Many of the examples in this manual, even those entered at the interactive
prompt, include comments.  Comments in Python start with the hash character,
``#``, and extend to the end of the physical line.  A comment may appear at the
start of a line or following whitespace or code, but not within a string
literal.  A hash character within a string literal is just a hash character.
Since comments are to clarify code and are not interpreted by Python, they may
be omitted when typing in examples.

Some examples::

   # 이 것이 첫 번째 주석입니다
   spam = 1  # 그리고 이 것이 두 번째 주석입니다
             # ... 그리고 이제 세 번째!
   text = "# 이것은 따옴표 안에 있기 때문에 주석이 아닙니다."


.. _tut-calculator:

Using Python as a Calculator
============================

Let's try some simple Python commands.  Start the interpreter and wait for the
primary prompt, ``>>>``.  (It shouldn't take long.)


.. _tut-numbers:

Numbers
-------

The interpreter acts as a simple calculator: you can type an expression at it
and it will write the value.  Expression syntax is straightforward: the
operators ``+``, ``-``, ``*`` and ``/`` work just like in most other languages
(for example, Pascal or C); parentheses (``()``) can be used for grouping.
For example::

   >>> 2 + 2
   4
   >>> 50 - 5*6
   20
   >>> (50 - 5*6) / 4
   5.0
   >>> 8 / 5  # 나눗셈은 항상 실수를 돌려줍니다
   1.6

The integer numbers (e.g. ``2``, ``4``, ``20``) have type :class:`int`,
the ones with a fractional part (e.g. ``5.0``, ``1.6``) have type
:class:`float`.  We will see more about numeric types later in the tutorial.

Division (``/``) always returns a float.  To do :term:`floor division` and
get an integer result (discarding any fractional result) you can use the ``//``
operator; to calculate the remainder you can use ``%``::

   >>> 17 / 3  # 고전적인 나눗셈은 float를 돌려줍니다
   5.666666666666667
   >>>
   >>> 17 // 3  # 정수 나눗셈은 소수부를 버립니다
   5
   >>> 17 % 3  # % 연산자는 나눗셈의 나머지를 돌려줍니다
   2
   >>> 5 * 3 + 2  # 몫 * 제수 + 나머지
   17

With Python, it is possible to use the ``**`` operator to calculate powers [#]_::

   >>> 5 ** 2  # 5 제곱
   25
   >>> 2 ** 7  # 2 의 7 제곱
   128

The equal sign (``=``) is used to assign a value to a variable. Afterwards, no
result is displayed before the next interactive prompt::

   >>> width = 20
   >>> height = 5 * 9
   >>> width * height
   900

If a variable is not "defined" (assigned a value), trying to use it will
give you an error::

   >>> n  # 정의되지 않은 변수에 접근하려고 시도합니다
   Traceback (most recent call last):
     File "<stdin>", line 1, in <module>
   NameError: name 'n' is not defined

There is full support for floating point; operators with mixed type operands
convert the integer operand to floating point::

   >>> 4 * 3.75 - 1
   14.0

In interactive mode, the last printed expression is assigned to the variable
``_``.  This means that when you are using Python as a desk calculator, it is
somewhat easier to continue calculations, for example::

   >>> tax = 12.5 / 100
   >>> price = 100.50
   >>> price * tax
   12.5625
   >>> price + _
   113.0625
   >>> round(_, 2)
   113.06

This variable should be treated as read-only by the user.  Don't explicitly
assign a value to it --- you would create an independent local variable with the
same name masking the built-in variable with its magic behavior.

In addition to :class:`int` and :class:`float`, Python supports other types of
numbers, such as :class:`~decimal.Decimal` and :class:`~fractions.Fraction`.
Python also has built-in support for :ref:`complex numbers <typesnumeric>`,
and uses the ``j`` or ``J`` suffix to indicate the imaginary part
(e.g. ``3+5j``).


.. _tut-strings:

Strings
-------

Besides numbers, Python can also manipulate strings, which can be expressed
in several ways.  They can be enclosed in single quotes (``'...'``) or
double quotes (``"..."``) with the same result [#]_.  ``\`` can be used
to escape quotes::

   >>> 'spam eggs'  # 작은 따옴표
   'spam eggs'
   >>> 'doesn\'t'  # 작은 따옴표를 이스케이프하는데 \' 를 사용합니다...
   "doesn't"
   >>> "doesn't"  # ...또는 큰따옴표를 사용합니다
   "doesn't"
   >>> '"Yes," they said.'
   '"Yes," they said.'
   >>> "\"Yes,\" they said."
   '"Yes," they said.'
   >>> '"Isn\'t," they said.'
   '"Isn\'t," they said.'

In the interactive interpreter, the output string is enclosed in quotes and
special characters are escaped with backslashes.  While this might sometimes
look different from the input (the enclosing quotes could change), the two
strings are equivalent.  The string is enclosed in double quotes if
the string contains a single quote and no double quotes, otherwise it is
enclosed in single quotes.  The :func:`print` function produces a more
readable output, by omitting the enclosing quotes and by printing escaped
and special characters::

   >>> '"Isn\'t," they said.'
   '"Isn\'t," they said.'
   >>> print('"Isn\'t," they said.')
   "Isn't," they said.
   >>> s = 'First line.\nSecond line.'  # \n 은 줄넘김을 뜻합니다
   >>> s  # print() 하지 않으면, \n 이 출력에 포함됩니다
   'First line.\nSecond line.'
   >>> print(s)  # print() 하면, \n 은 새 줄을 만듭니다
   First line.
   Second line.

If you don't want characters prefaced by ``\`` to be interpreted as
special characters, you can use *raw strings* by adding an ``r`` before
the first quote::

   >>> print('C:\some\name')  # 여기에서 \n 은 줄넘김을 뜻합니다!
   C:\some
   ame
   >>> print(r'C:\some\name')  # 따옴표 앞의 r 에 주의하세요
   C:\some\name

String literals can span multiple lines.  One way is using triple-quotes:
``"""..."""`` or ``'''...'''``.  End of lines are automatically
included in the string, but it's possible to prevent this by adding a ``\`` at
the end of the line.  The following example::

   print("""\
   Usage: thingy [OPTIONS]
        -h                        Display this usage message
        -H hostname               Hostname to connect to
   """)

produces the following output (note that the initial newline is not included):

.. code-block:: text

   Usage: thingy [OPTIONS]
        -h                        Display this usage message
        -H hostname               Hostname to connect to

Strings can be concatenated (glued together) with the ``+`` operator, and
repeated with ``*``::

   >>> # 'un' dmf 3번 반복하고 'ium' 을 붙입니다
   >>> 3 * 'un' + 'ium'
   'unununium'

Two or more *string literals* (i.e. the ones enclosed between quotes) next
to each other are automatically concatenated. ::

   >>> 'Py' 'thon'
   'Python'

This feature is particularly useful when you want to break long strings::

   >>> text = ('Put several strings within parentheses '
   ...         'to have them joined together.')
   >>> text
   'Put several strings within parentheses to have them joined together.'

This only works with two literals though, not with variables or expressions::

   >>> prefix = 'Py'
   >>> prefix 'thon'  # 변수와 문자열 리터럴을 이어붙이기할 수 없습니다
     ...
   SyntaxError: invalid syntax
   >>> ('un' * 3) 'ium'
     ...
   SyntaxError: invalid syntax

If you want to concatenate variables or a variable and a literal, use ``+``::

   >>> prefix + 'thon'
   'Python'

Strings can be *indexed* (subscripted), with the first character having index 0.
There is no separate character type; a character is simply a string of size
one::

   >>> word = 'Python'
   >>> word[0]  # 위치 0의 문자
   'P'
   >>> word[5]  # 위치 5의 문자
   'n'

Indices may also be negative numbers, to start counting from the right::

   >>> word[-1]  # 마지막 문자
   'n'
   >>> word[-2]  # 끝에서 두 번째 문자
   'o'
   >>> word[-6]
   'P'

Note that since -0 is the same as 0, negative indices start from -1.

In addition to indexing, *slicing* is also supported.  While indexing is used
to obtain individual characters, *slicing* allows you to obtain substring::

   >>> word[0:2]  # 위치 0 (포함) 에서 2 (제외) 까지의 문자들
   'Py'
   >>> word[2:5]  # 위치 2 (포함) 에서 5 (제외) 까지의 문자들
   'tho'

Note how the start is always included, and the end always excluded.  This
makes sure that ``s[:i] + s[i:]`` is always equal to ``s``::

   >>> word[:2] + word[2:]
   'Python'
   >>> word[:4] + word[4:]
   'Python'

Slice indices have useful defaults; an omitted first index defaults to zero, an
omitted second index defaults to the size of the string being sliced. ::

   >>> word[:2]   # 처음부터 위치 2 (제외) 까지의 문자들
   'Py'
   >>> word[4:]   # 위치 4 (포함) 에서 끝까지의 문자들
   'on'
   >>> word[-2:]  # 끝에서 두번째 (포함) 부터 끝까지의 문자들
   'on'

One way to remember how slices work is to think of the indices as pointing
*between* characters, with the left edge of the first character numbered 0.
Then the right edge of the last character of a string of *n* characters has
index *n*, for example::

    +---+---+---+---+---+---+
    | P | y | t | h | o | n |
    +---+---+---+---+---+---+
    0   1   2   3   4   5   6
   -6  -5  -4  -3  -2  -1

The first row of numbers gives the position of the indices 0...6 in the string;
the second row gives the corresponding negative indices. The slice from *i* to
*j* consists of all characters between the edges labeled *i* and *j*,
respectively.

For non-negative indices, the length of a slice is the difference of the
indices, if both are within bounds.  For example, the length of ``word[1:3]`` is
2.

Attempting to use an index that is too large will result in an error::

   >>> word[42]  # word 는 6개의 문자 뿐입니다
   Traceback (most recent call last):
     File "<stdin>", line 1, in <module>
   IndexError: string index out of range

However, out of range slice indexes are handled gracefully when used for
slicing::

   >>> word[4:42]
   'on'
   >>> word[42:]
   ''

Python strings cannot be changed --- they are :term:`immutable`.
Therefore, assigning to an indexed position in the string results in an error::

   >>> word[0] = 'J'
     ...
   TypeError: 'str' object does not support item assignment
   >>> word[2:] = 'py'
     ...
   TypeError: 'str' object does not support item assignment

If you need a different string, you should create a new one::

   >>> 'J' + word[1:]
   'Jython'
   >>> word[:2] + 'py'
   'Pypy'

The built-in function :func:`len` returns the length of a string::

   >>> s = 'supercalifragilisticexpialidocious'
   >>> len(s)
   34


.. seealso::

   :ref:`textseq`
      Strings are examples of *sequence types*, and support the common
      operations supported by such types.

   :ref:`string-methods`
      Strings support a large number of methods for
      basic transformations and searching.

   :ref:`f-strings`
      String literals that have embedded expressions.

   :ref:`formatstrings`
      Information about string formatting with :meth:`str.format`.

   :ref:`old-string-formatting`
      The old formatting operations invoked when strings are
      the left operand of the ``%`` operator are described in more detail here.


.. _tut-lists:

Lists
-----

Python knows a number of *compound* data types, used to group together other
values.  The most versatile is the *list*, which can be written as a list of
comma-separated values (items) between square brackets.  Lists might contain
items of different types, but usually the items all have the same type. ::

   >>> squares = [1, 4, 9, 16, 25]
   >>> squares
   [1, 4, 9, 16, 25]

Like strings (and all other built-in :term:`sequence` type), lists can be
indexed and sliced::

   >>> squares[0]  # 인덱싱은 항목을 돌려줍니다
   1
   >>> squares[-1]
   25
   >>> squares[-3:]  # 슬라이싱은 새 리스트를 돌려줍니다
   [9, 16, 25]

All slice operations return a new list containing the requested elements.  This
means that the following slice returns a new (shallow) copy of the list::

   >>> squares[:]
   [1, 4, 9, 16, 25]

Lists also support operations like concatenation::

   >>> squares + [36, 49, 64, 81, 100]
   [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]

Unlike strings, which are :term:`immutable`, lists are a :term:`mutable`
type, i.e. it is possible to change their content::

    >>> cubes = [1, 8, 27, 65, 125]  # 여기 뭔가 잘못 됐습니다
    >>> 4 ** 3  # 4의 세제곱은 65가 아니라 64입니다!
    64
    >>> cubes[3] = 64  # 잘못된 값을 고칩니다
    >>> cubes
    [1, 8, 27, 64, 125]

You can also add new items at the end of the list, by using
the :meth:`~list.append` *method* (we will see more about methods later)::

   >>> cubes.append(216)  # 6의 세제곱을 추가합니다
   >>> cubes.append(7 ** 3)  # 그리고 7의 세제곱도
   >>> cubes
   [1, 8, 27, 64, 125, 216, 343]

Assignment to slices is also possible, and this can even change the size of the
list or clear it entirely::

   >>> letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
   >>> letters
   ['a', 'b', 'c', 'd', 'e', 'f', 'g']
   >>> # 몇몇 값을 바꿉니다
   >>> letters[2:5] = ['C', 'D', 'E']
   >>> letters
   ['a', 'b', 'C', 'D', 'E', 'f', 'g']
   >>> # 이제 그 것들을 지웁니다
   >>> letters[2:5] = []
   >>> letters
   ['a', 'b', 'f', 'g']
   >>> # 모든 요소들을 빈 리스트로 치환해서 리스트를 비웁니다
   >>> letters[:] = []
   >>> letters
   []

The built-in function :func:`len` also applies to lists::

   >>> letters = ['a', 'b', 'c', 'd']
   >>> len(letters)
   4

It is possible to nest lists (create lists containing other lists), for
example::

   >>> a = ['a', 'b', 'c']
   >>> n = [1, 2, 3]
   >>> x = [a, n]
   >>> x
   [['a', 'b', 'c'], [1, 2, 3]]
   >>> x[0]
   ['a', 'b', 'c']
   >>> x[0][1]
   'b'

.. _tut-firststeps:

First Steps Towards Programming
===============================

Of course, we can use Python for more complicated tasks than adding two and two
together.  For instance, we can write an initial sub-sequence of the
`Fibonacci series <https://en.wikipedia.org/wiki/Fibonacci_number>`_
as follows::

   >>> # 피보나치 수열:
   ... # 두 요소의 합이 다음을 정의합니다
   ... a, b = 0, 1
   >>> while a < 10:
   ...     print(a)
   ...     a, b = b, a+b
   ...
   0
   1
   1
   2
   3
   5
   8

This example introduces several new features.

* The first line contains a *multiple assignment*: the variables ``a`` and ``b``
  simultaneously get the new values 0 and 1.  On the last line this is used again,
  demonstrating that the expressions on the right-hand side are all evaluated
  first before any of the assignments take place.  The right-hand side expressions
  are evaluated  from the left to the right.

* The :keyword:`while` loop executes as long as the condition (here: ``a < 10``)
  remains true.  In Python, like in C, any non-zero integer value is true; zero is
  false.  The condition may also be a string or list value, in fact any sequence;
  anything with a non-zero length is true, empty sequences are false.  The test
  used in the example is a simple comparison.  The standard comparison operators
  are written the same as in C: ``<`` (less than), ``>`` (greater than), ``==``
  (equal to), ``<=`` (less than or equal to), ``>=`` (greater than or equal to)
  and ``!=`` (not equal to).

* The *body* of the loop is *indented*: indentation is Python's way of grouping
  statements.  At the interactive prompt, you have to type a tab or space(s) for
  each indented line.  In practice you will prepare more complicated input
  for Python with a text editor; all decent text editors have an auto-indent
  facility.  When a compound statement is entered interactively, it must be
  followed by a blank line to indicate completion (since the parser cannot
  guess when you have typed the last line).  Note that each line within a basic
  block must be indented by the same amount.

* The :func:`print` function writes the value of the argument(s) it is given.
  It differs from just writing the expression you want to write (as we did
  earlier in the calculator examples) in the way it handles multiple arguments,
  floating point quantities, and strings.  Strings are printed without quotes,
  and a space is inserted between items, so you can format things nicely, like
  this::

     >>> i = 256*256
     >>> print('The value of i is', i)
     The value of i is 65536

  The keyword argument *end* can be used to avoid the newline after the output,
  or end the output with a different string::

     >>> a, b = 0, 1
     >>> while a < 1000:
     ...     print(a, end=',')
     ...     a, b = b, a+b
     ...
     0,1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,


.. rubric:: Footnotes

.. [#] Since ``**`` has higher precedence than ``-``, ``-3**2`` will be
   interpreted as ``-(3**2)`` and thus result in ``-9``.  To avoid this
   and get ``9``, you can use ``(-3)**2``.

.. [#] Unlike other languages, special characters such as ``\n`` have the
   same meaning with both single (``'...'``) and double (``"..."``) quotes.
   The only difference between the two is that within single quotes you don't
   need to escape ``"`` (but you have to escape ``\'``) and vice versa.
